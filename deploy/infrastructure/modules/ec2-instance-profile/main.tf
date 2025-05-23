resource "aws_iam_role" "this" {
  name = "helloivy-production-ec2-instance-role"
  path = "/ecs/"

  assume_role_policy = <<EOF
{
  "Version": "2008-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": [
        "ec2.amazonaws.com", 
        "ssm.amazonaws.com", 
        "ecs-tasks.amazonaws.com",
        "events.amazonaws.com",
        "scheduler.amazonaws.com"
        ]
      },
      "Effect": "Allow"
    }
  ]
}
EOF
}

resource "aws_iam_instance_profile" "this" {
  name = "helloivy-production-ec2-instance-profile"
  role = aws_iam_role.this.name
}

resource "aws_iam_role_policy_attachment" "ecs_ec2_cloudwatch_role" {
  role       = aws_iam_role.this.id
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

resource "aws_iam_role_policy_attachment" "ec2_elastic_ip_arrange" {
  role       = aws_iam_role.this.id
  policy_arn = "arn:aws:iam::944000130876:policy/ec2_elastic_ip_arrange"
}

resource "aws_iam_role_policy_attachment" "sqs_allow" {
  role       = aws_iam_role.this.id
  policy_arn = "arn:aws:iam::aws:policy/AmazonSQSFullAccess"
}

resource "aws_iam_role_policy_attachment" "ec2_container" {
  role       = aws_iam_role.this.id
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_role_policy_attachment" "ssm_read" {
  role       = aws_iam_role.this.id
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
}