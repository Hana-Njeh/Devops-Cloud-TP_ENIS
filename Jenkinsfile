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
                        sh "terraform init"
                        sh "terraform apply --auto-approve"
                    }
                    dir('my-terraform-project') {
                        sh "terraform init"
                        sh "terraform plan -lock=false"
                        sh "terraform apply -lock=false --auto-approve"

                        EC2_PUBLIC_IP = sh(
                            script: "terraform output instance_details | grep 'instance_public_ip' | awk '{print \$3}' | tr -d '\"'",
                            returnStdout: true
                        ).trim()

                        RDS_ENDPOINT = sh(
                            script: """
                                terraform output rds_endpoint | grep 'endpoint' | awk -F'=' '{print \$2}' | tr -d '[:space:]\"' | sed 's/:3306//'
                            """,
                            returnStdout: true
                        ).trim()

                        DEPLOYER_KEY_URI = sh(
                            script: "terraform output deployer_key_s3_uri | tr -d '\"'",
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
                        sh """
                            echo "Contents of config.js after update:"
                            cat config.js
                        """
                    }
                }
            }
        }
        stage('Update Backend Configuration') {
            steps {
                script {
                    dir('enis-app-tp/backend/backend') {
                        sh """
                            if [ -f "settings.py" ]; then
                                echo "Found settings.py at $(pwd)"
                            else
                                echo "settings.py not found in $(pwd)!"
                                exit 1
                            fi
                        """

                        sh """
                            sed -i "/'HOST':/c\\            'HOST': '${RDS_ENDPOINT}'," settings.py
                        """

                        sh """
                            echo "DATABASES section of settings.py after update:"
                            sed -n '/DATABASES = {/,/^}/p' settings.py
                        """
                    }
                }
            }
        }
        stage('Create Database in RDS') {
            steps {
                script {
                    try {
                        echo "Creating database in RDS..."
                        sh """
                            mysql -h ${RDS_ENDPOINT} -P 3306 -u dbuser -p${DB_PASSWORD} -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"
                            mysql -h ${RDS_ENDPOINT} -P 3306 -u dbuser -p${DB_PASSWORD} -e "SHOW DATABASES;"
                        """
                    } catch (Exception e) {
                        error "Failed to create database or list databases in RDS: ${e.message}"
                    }
                }
            }
        }
        stage('Build Frontend Docker Image') {
            steps {
                dir('enis-app-tp/frontend') {
                    script {
                        echo 'Building Frontend Docker Image...'
                        def frontendImage = docker.build("frontend-app:${env.BUILD_ID}")
                        echo "Built Frontend Image: ${frontendImage.id}"
                    }
                }
            }
        }
        stage('Build Backend Docker Image') {
            steps {
                dir('enis-app-tp/backend') {
                    script {
                        echo 'Building Backend Docker Image...'
                        def backendImage = docker.build("backend-app:${env.BUILD_ID}")
                        echo "Built Backend Image: ${backendImage.id}"
                    }
                }
            }
        }
        stage('Login to AWS ECR') {
            steps {
                script {
                    try {
                        echo 'Logging into AWS ECR...'
                        sh """
                            aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO_URL}
                        """
                    } catch (Exception e) {
                        error "Failed to login to AWS ECR: ${e.message}"
                    }
                }
            }
        }
        stage('Tag and Push Frontend Image') {
            steps {
                script {
                    echo 'Tagging and pushing Frontend Image...'
                    sh "docker tag frontend-app:${env.BUILD_ID} ${IMAGE_REPO}:${env.BUILD_ID}-frontend"
                    sh "docker push ${IMAGE_REPO}:${env.BUILD_ID}-frontend"
                }
            }
        }
        stage('Tag and Push Backend Image') {
            steps {
                script {
                    echo 'Tagging and pushing Backend Image...'
                    sh "docker tag backend-app:${env.BUILD_ID} ${IMAGE_REPO}:${env.BUILD_ID}-backend"
                    sh "docker push ${IMAGE_REPO}:${env.BUILD_ID}-backend"
                }
            }
        }
    }
}
