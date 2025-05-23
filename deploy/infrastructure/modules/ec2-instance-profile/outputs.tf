output "iam_instance_profile_id" {
  value = aws_iam_instance_profile.this.id
}

output "aws_iam_role_arn" {
  value = aws_iam_role.this.arn
}