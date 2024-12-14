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
                        // Apply Terraform configuration for remote backend
                        bat "terraform apply --auto-approve"
                    }
                    dir('my-terraform-project') {
                        // Initialize Terraform
                        bat "terraform init"
                        bat "terraform plan -lock=false"
                        // Apply Terraform configuration
                        bat "terraform apply -lock=false --auto-approve"
                        // Get EC2 Public IP
                        EC2_PUBLIC_IP = bat(
                            script: '''
                                terraform output instance_details | findstr "instance_public_ip" | for /f "tokens=2 delims== " %%i in ('findstr "instance_public_ip"') do echo %%i
                            ''',
                            returnStdout: true
                        ).trim()
                        // Get RDS Endpoint
                        RDS_ENDPOINT = bat(
                            script: '''
                                terraform output rds_endpoint | findstr "endpoint" | for /f "tokens=2 delims== " %%i in ('findstr "endpoint"') do echo %%i
                            ''',
                            returnStdout: true
                        ).trim()
                        // Get Deployer Key URI
                        DEPLOYER_KEY_URI = bat(
                            script: '''
                                terraform output deployer_key_s3_uri
                            ''',
                            returnStdout: true
                        ).trim()
                        // Debugging: Print captured values
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
                            echo Contents of config.js after update:
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
                        // Verify the existence of settings.py
                        bat '''
                            if exist "settings.py" (
                                echo Found settings.py at %cd%
                            ) else (
                                echo settings.py not found in %cd%!
                                exit /b 1
                            )
                        '''
                        // Update the HOST in the DATABASES section
                        bat """
                            powershell -Command "(gc settings.py) -replace \"'HOST':.*\", \"'HOST': '${RDS_ENDPOINT}',\" | sc settings.py"
                        """
                        // Verify the DATABASES section after the update
                        bat '''
                            echo DATABASES section of settings.py after update:
                            powershell -Command "(gc settings.py) -match 'DATABASES = {' -join '`n'"
                        '''
                    }
                }
            }
        }
    }
}
