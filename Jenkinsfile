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
                    dir('my-terraform-project/remote_backend') {
                        bat "terraform init"
                        // Appliquer la configuration Terraform pour le backend distant
                        bat "terraform apply --auto-approve"
                    }
                    dir('my-terraform-project') {
                        // Initialiser Terraform
                        bat "terraform init"
                        bat "terraform plan -lock=false"
                        // Appliquer la configuration Terraform
                        bat "terraform apply -lock=false --auto-approve"
                        // Récupérer l'adresse IP publique de l'EC2
                        EC2_PUBLIC_IP = bat(
                            script: """
                                terraform output instance_details | findstr /c:"instance_public_ip" | for /f "tokens=3" %%a in ('more') do @echo %%a
                            """,
                            returnStdout: true
                        ).trim()
                        // Récupérer le point de terminaison de la RDS
                        RDS_ENDPOINT = bat(
                            script: """
                                terraform output rds_endpoint | findstr /c:"endpoint" | for /f "tokens=2 delims==" %%a in ('more') do @echo %%a | sed "s/:3306//"
                            """,
                            returnStdout: true
                        ).trim()
                        // Récupérer l'URI de la clé de déploiement
                        DEPLOYER_KEY_URI = bat(
                            script: "terraform output deployer_key_s3_uri | for /f %%a in ('more') do @echo %%a",
                            returnStdout: true
                        ).trim()
                        // Débogage : afficher les valeurs récupérées
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
                        // Vérifier l'existence de settings.py
                        bat '''
                            if exist "settings.py" (
                                echo Found settings.py at %cd%
                            ) else (
                                echo settings.py not found in %cd%!
                                exit /b 1
                            )
                        '''
                        // Mettre à jour le HOST dans la section DATABASES
                        bat """
                            powershell -Command "(Get-Content settings.py) -replace \"'HOST': '.*'\", \"'HOST': '${RDS_ENDPOINT}',\" | Set-Content settings.py"
                        """
                        // Vérifier la section DATABASES après la mise à jour
                        bat '''
                            echo "DATABASES section of settings.py after update:"
                            findstr /C:"'HOST':" settings.py
                        '''
                    }
                }
            }
        }
    }
}
