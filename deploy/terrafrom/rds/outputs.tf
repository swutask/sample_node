// output from secret storage
output "rds_password" {
  value = data.aws_ssm_parameter.main_rds_password.value
}


output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "username" {
  value = aws_db_instance.main.username
}

output "password" {
  value = aws_db_instance.main.password
}

output "name" {
  value = aws_db_instance.main.name
}
