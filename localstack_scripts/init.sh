#!/usr/bin/env bash

set -euo pipefail

echo "configuring localstack"
LOCALSTACK_HOST=localhost
AWS_REGION=us-east-1

create_queue() {
    echo "sqs create queue"
    local QUEUE_NAME_TO_CREATE=$1

    awslocal sqs create-queue \
    --queue-name ${QUEUE_NAME_TO_CREATE} \
    --region ${AWS_REGION} \
    --attributes VisibilityTimeout=180,ReceiveMessageWaitTimeSeconds=1,MessageRetentionPeriod=345600,DelaySeconds=0
}

create_role() {
    local NAME=$1

    awslocal iam create-role \
    --role-name ${NAME} \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::000000000000:root"},"Action":"sts:AssumeRole"}]}'
}

create_queue "email-notification"
create_queue "email-activity"
create_queue "push-activity"
create_queue "activity"
create_queue "reminder"

create_role "reminder"
