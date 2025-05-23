output "vpc_id" {
  value = aws_vpc.main.id
}

output "vpc_cidr" {
  value = aws_vpc.main.cidr_block
}

output "subnet_cidr" {
  value = aws_subnet.public_subnets[*].cidr_block
}

output "public_subnet_ids" {
  value = aws_subnet.public_subnets[*].id
}

output "pub_id" {
  value = aws_eip.main[*].id
}

output "pub_ip" {
  value = aws_eip.main[*].public_ip
}


output "public_subnet_availability_zone" {
  value = aws_subnet.public_subnets[*].availability_zone
}
