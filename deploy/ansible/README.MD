## Examples

# Check connection
ansible all -m ping  -i aws_ec2.yml --private-key ~/.ssh/production-helloivy -u ubuntu

# Install software for back end
ansible-playbook provision.yml -i aws_ec2.yml --private-key ~/.ssh/production-helloivy --vault-password-file pass -e @group_vars/production.yml

# Deploy back end app
ansible-playbook deploy.yml -i aws_ec2.yml --private-key ~/.ssh/production-helloivy --vault-password-file pass -e @group_vars/production.yml


PGPASSWORD='Y3DfEA!5!wSk' psql -h production.c0yieryuc91u.eu-central-1.rds.amazonaws.com --user=administrator  postgres -c "create database productiondb;"