def EC2_PUBLIC_IP = ""
def RDS_ENDPOINT = ""
def DEPLOYER_KEY_URI = ""

pipeline {
    agent any
    environment {
        AWS_ACCESS_KEY_ID = credentials('jenkins_aws_access_key_id')
        AWS_SECRET_ACCESS_KEY = credentials('jenkins_aws_secret_access_key')
        ECR_REPO_URL = '481665114111.dkr.ecr.us-east-1.amazonaws.com'
        ECR_REPO_NAME = 'enis-app'
        IMAGE_REPO = "${ECR_REPO_URL}/${ECR_REPO_NAME}"
        AWS_REGION = "us-east-1"
    }
    stages {
        stage('Provision Server and Database') {
            steps {
                script {
                    dir('my-terraform-project\\remote-backend') {
                        bat 'terraform init'
                        bat 'terraform apply --auto-approve'
                    }
                    dir('my-terraform-project') {
                        bat 'terraform init'
                        bat 'terraform plan -lock=false'
                        bat 'terraform apply -lock=false --auto-approve'

                        // Capturer la sortie d'EC2 Public IP
                        EC2_PUBLIC_IP = bat(
                            script: '''
                                terraform output instance_details
                            ''',
                            returnStdout: true
                        ).trim()

                        // Capturer le RDS Endpoint
                        RDS_ENDPOINT = bat(
                            script: '''
                                terraform output rds_endpoint
                            ''',
                            returnStdout: true
                        ).trim()

                        // Capturer le URI du Deployer Key
                        DEPLOYER_KEY_URI = bat(
                            script: '''
                                terraform output deployer_key_s3_uri
                            ''',
                            returnStdout: true
                        ).trim()

                        // Afficher les valeurs dans les logs de Jenkins
                        echo "EC2 Public IP: ${EC2_PUBLIC_IP}"
                        echo "RDS Endpoint: ${RDS_ENDPOINT}"
                        echo "Deployer Key URI: ${DEPLOYER_KEY_URI}"
                    }
                }
            }
        }
        stage('Update Frontend Configuration') {
            steps {
                script {
                    dir('enis-app-tp\\frontend\\src') {
                        writeFile file: 'config.js', text: """
                            export const API_BASE_URL = 'http://${EC2_PUBLIC_IP}:8000';
                        """
                        bat '''
                            echo "Contents of config.js after update:"
                            type config.js
                        '''
                    }
                }
            }
        }
        stage('Update Backend Configuration') {
            steps {
                script {
                    dir('enis-app-tp\\backend\\backend') {
                        bat '''
                            if exist "settings.py" (
                                echo Found settings.py at %cd%
                            ) else (
                                echo settings.py not found in %cd%!
                                exit /b 1
                            )
                        '''
                        bat """
                            powershell -Command "(gc settings.py) -replace '\\'HOST\\':.*', '\\'HOST\\': '${RDS_ENDPOINT}', ' | sc settings.py"
                        """
                        bat '''
                            echo "DATABASES section of settings.py after update:"
                            powershell -Command "(gc settings.py -TotalCount 100) -match 'DATABASES' -or $_ -match '}'"
                        '''
                    }
                }
            }
        }
    }
}
