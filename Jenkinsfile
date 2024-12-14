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
                    dir('my-terraform-project/remote-backend') {
                        bat "terraform init"
                        bat "terraform apply --auto-approve"
                    }
                    dir('my-terraform-project') {
                        bat "terraform init"
                        bat "terraform plan -lock=false"
                        bat "terraform apply -lock=false --auto-approve"

                        // Utilisation de PowerShell pour capturer les valeurs
                        EC2_PUBLIC_IP = powershell(script: '''
                            $output = terraform output instance_details
                            $ip = ($output | Select-String "instance_public_ip").ToString().Split('"')[1]
                            return $ip
                        ''', returnStdout: true).trim()

                        RDS_ENDPOINT = powershell(script: '''
                            $output = terraform output rds_endpoint
                            $endpoint = ($output | Select-String "endpoint").ToString().Split('=')[1].Trim().Trim('"')
                            return $endpoint -replace ':3306', ''
                        ''', returnStdout: true).trim()

                        DEPLOYER_KEY_URI = powershell(script: '''
                            $uri = terraform output deployer_key_s3_uri
                            return $uri.Trim('"')
                        ''', returnStdout: true).trim()

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
                    dir('enis-app-tp/frontend/src') {
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
                    dir('enis-app-tp/backend/backend') {
                        bat '''
                            if exist "settings.py" (
                                echo "Found settings.py at %cd%"
                            ) else (
                                echo "settings.py not found in %cd%!"
                                exit 1
                            )
                        '''
                        // Utilisation de PowerShell pour mettre à jour le fichier settings.py
                        bat """
                            powershell -Command "(Get-Content settings.py) -replace \"'HOST': '.*'\", \"'HOST': '${RDS_ENDPOINT}'\" | Set-Content settings.py"
                        """
                        bat '''
                            echo "DATABASES section of settings.py after update:"
                            powershell -Command "Get-Content settings.py | Select-String -Pattern 'DATABASES = {','^}'"
                        '''
                    }
                }
            }
        }
    }
}
