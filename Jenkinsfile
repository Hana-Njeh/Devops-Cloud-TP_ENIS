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
                        // Initialize and apply Terraform
                        bat "terraform init"
                        bat "terraform plan -lock=false"
                        bat "terraform apply -lock=false --auto-approve"
                        
                        // Capture EC2 Public IP
                        EC2_PUBLIC_IP = bat(
                            script: '''
                                setlocal enabledelayedexpansion
                                for /f "tokens=3" %%a in ('terraform output instance_details ^| findstr "instance_public_ip"') do (
                                    set EC2_PUBLIC_IP=%%a
                                )
                                set EC2_PUBLIC_IP=!EC2_PUBLIC_IP:"=!
                                echo !EC2_PUBLIC_IP!
                            ''',
                            returnStdout: true
                        ).trim()

                        // Capture RDS Endpoint
                        RDS_ENDPOINT = bat(
                            script: '''
                                setlocal enabledelayedexpansion
                                for /f "tokens=2 delims==" %%a in ('terraform output rds_endpoint') do (
                                    set RDS_ENDPOINT=%%a
                                )
                                set RDS_ENDPOINT=!RDS_ENDPOINT:"=!
                                powershell -Command "$RDS_ENDPOINT = '$RDS_ENDPOINT'; $RDS_ENDPOINT = $RDS_ENDPOINT -replace ':3306', ''; Write-Output $RDS_ENDPOINT"
                            ''',
                            returnStdout: true
                        ).trim()

                        // Capture Deployer Key URI
                        DEPLOYER_KEY_URI = bat(
                            script: '''
                                setlocal enabledelayedexpansion
                                for /f "tokens=*" %%a in ('terraform output deployer_key_s3_uri') do (
                                    set DEPLOYER_KEY_URI=%%a
                                )
                                set DEPLOYER_KEY_URI=!DEPLOYER_KEY_URI:"=!
                                powershell -Command "$DEPLOYER_KEY_URI = '$DEPLOYER_KEY_URI'; Write-Output $DEPLOYER_KEY_URI"
                            ''',
                            returnStdout: true
                        ).trim()

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
                        // Verify existence of settings.py
                        bat '''
                            if exist "settings.py" (
                                echo "Found settings.py at %cd%"
                            ) else (
                                echo "settings.py not found in %cd%! Check path and file."
                                exit 1
                            )
                        '''
                        // Update the HOST in the DATABASES section using Windows native batch script
                        bat """
                            setlocal enabledelayedexpansion
                            set SEARCH_PATTERN='HOST': 
                            set REPLACE_PATTERN='HOST': '${RDS_ENDPOINT}'
                            for /f "delims=" %%a in ('findstr /i /c:"DATABASES =" settings.py') do (
                                set LINE=%%a
                                set "LINE=!LINE:%SEARCH_PATTERN%=%REPLACE_PATTERN%!"
                                echo !LINE! >> new_settings.py
                            )
                            move /y new_settings.py settings.py
                        """
                        // Verify DATABASES section after the update
                        bat '''
                            echo "DATABASES section of settings.py after update:"
                            findstr /i /c:"DATABASES =" settings.py
                        '''
                    }
                }
            }
        }
    }
}
