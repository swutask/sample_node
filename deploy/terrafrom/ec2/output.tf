output "ec2_backend_id" {
  value = aws_instance.backend[*].id
}


output "ec2_backend_count" {
  value = length(aws_instance.backend)
}