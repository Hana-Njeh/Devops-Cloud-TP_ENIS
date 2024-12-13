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
                    // Provision backend resources
                    dir('my-terraform-project/remote_backend') {
                        echo "Initializing Terraform for remote backend..."
                        sh "terraform init"
                        echo "Applying Terraform configuration for remote backend..."
                        sh "terraform apply --auto-approve"
                    }
                    // Provision main infrastructure
                    dir('my-terraform-project') {
                        echo "Initializing Terraform for main project..."
                        sh "terraform init"
                        echo "Planning Terraform changes..."
                        sh "terraform plan -lock=false"
                        echo "Applying Terraform configuration..."
                        sh "terraform apply -lock=false --auto-approve"
                        
                        // Capture and print EC2 Public IP
                        EC2_PUBLIC_IP = sh(
                            script: "terraform output instance_details | grep 'instance_public_ip' | awk '{print \$3}' | tr -d '\"'",
                            returnStdout: true
                        ).trim()
                        echo "EC2 Public IP: ${EC2_PUBLIC_IP}"
                        
                        // Capture and print RDS Endpoint
                        RDS_ENDPOINT = sh(
                            script: """
                                terraform output rds_endpoint | grep 'endpoint' | awk -F'=' '{print \$2}' | tr -d '[:space:]\"' | sed 's/:3306//'
                            """,
                            returnStdout: true
                        ).trim()
                        echo "RDS Endpoint: ${RDS_ENDPOINT}"
                        
                        // Capture and print Deployer Key URI
                        DEPLOYER_KEY_URI = sh(
                            script: "terraform output deployer_key_s3_uri | tr -d '\"'",
                            returnStdout: true
                        ).trim()
                        echo "Deployer Key URI: ${DEPLOYER_KEY_URI}"
                    }
                }
            }
        }
        stage('Update Frontend Configuration') {
            steps {
                script {
                    dir('enis-app-tp/frontend/src') {
                        echo "Updating frontend configuration..."
                        writeFile file: 'config.js', text: """
                            export const API_BASE_URL = 'http://${EC2_PUBLIC_IP}:8000';
                        """
                        echo "Contents of config.js after update:"
                        sh 'cat config.js'
                    }
                }
            }
        }
        stage('Update Backend Configuration') {
            steps {
                script {
                    dir('enis-app-tp/backend/backend') {
                        echo "Verifying existence of settings.py..."
                        sh '''
                            if [ -f "settings.py" ]; then
                                echo "Found settings.py at $(pwd)"
                            else
                                echo "settings.py not found in $(pwd)!"
                                exit 1
                            fi
                        '''
                        echo "Updating the HOST in DATABASES section of settings.py..."
                        sh """
                            sed -i "/'HOST':/c\\            'HOST': '${RDS_ENDPOINT}'," settings.py
                        """
                        echo "DATABASES section of settings.py after update:"
                        sh '''
                            sed -n '/DATABASES = {/,/^}/p' settings.py
                        '''
                    }
                }
            }
        }
    }
}
