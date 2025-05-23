provider "aws" {
  region = var.region
}

#---------------------------------------------------------------------------------------------------------------------
terraform {
  backend "s3" {
    bucket = "helloivy-co-infrastructure" 
    key    = "test/elb/terraform.tfstate"
    region = "eu-central-1"               
  }
}

data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "helloivy-co-infrastructure"           
    key    = "test/network/terraform.tfstate"  
    region = "eu-central-1"                      
  }
}

data "terraform_remote_state" "ec2" {
  backend = "s3"
  config = {
    bucket = "helloivy-co-infrastructure"           
    key    = "test/ec2/terraform.tfstate"  
    region = "eu-central-1"                      
  }
}


data "aws_route53_zone" "main" {
  name = "${var.main_domain}"
}

// First approve certificate
data "aws_acm_certificate" "main" {
  domain      = "${var.main_domain}"
  types       = ["AMAZON_ISSUED"]
  most_recent = true
}

#-----------------------------------------------------------------------------------------------------------

resource "aws_security_group" "elb" {
  name   = "elb security group"
  vpc_id = "${data.terraform_remote_state.network.outputs.vpc_id}"
  description = "Allow inbound traffic from ELB for back end"

  dynamic "ingress" {
    for_each = var.elb_ports
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"] 
    }
  }
  # outcoming rule
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, { Name = "${var.common_tags["Environment"]}-sg" })
}


resource "aws_lb" "api" {
  name               = "alb-api"
  internal           = false
  load_balancer_type = "application"
  subnets            = [data.terraform_remote_state.network.outputs.public_subnet_ids[0], data.terraform_remote_state.network.outputs.public_subnet_ids[1]]
  security_groups    = [aws_security_group.elb.id]
  enable_deletion_protection = true

  tags = merge(var.common_tags, {
    Name = "${var.common_tags["Environment"]}-${var.common_tags["Project"]}-ALB",
  Project = "${var.common_tags["Project"]}" })
}


resource "aws_lb_target_group" "main" {
  name        = "${var.common_tags["Environment"]}-tg"
  vpc_id      = "${data.terraform_remote_state.network.outputs.vpc_id}"
  port        = var.node_port
  protocol    = "HTTP"
  target_type = "instance"
  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    port                = var.node_port
    path                = "/api/health"
    interval            = 10
  }

}

resource "aws_lb_target_group_attachment" "main" {
  count = data.terraform_remote_state.ec2.outputs.ec2_backend_count
  target_group_arn = "${aws_lb_target_group.main.arn}"
  target_id        = data.terraform_remote_state.ec2.outputs.ec2_backend_id[count.index]
  port             = var.node_port
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = "${aws_lb.api.arn}"
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}


resource "aws_lb_listener" "https" {
  load_balancer_arn = "${aws_lb.api.arn}"
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = "${data.aws_acm_certificate.main.arn}"

  default_action {
    type             = "forward"
    target_group_arn = "${aws_lb_target_group.main.arn}"
  }

}


resource "aws_lb_listener_rule" "main" {
  listener_arn = "${aws_lb_listener.https.arn}"
  priority     = 101

  action {
    type             = "forward"
    target_group_arn = "${aws_lb_target_group.main.arn}"
  }

  condition {
    host_header {
      values = [aws_route53_record.main.name]
    }
  }
}

#---------------------------------------------------------------------------------------------------------------------

resource "aws_route53_record" "main" {
  depends_on = [aws_lb.api]
  zone_id    = "${data.aws_route53_zone.main.zone_id}"
  name       = "${var.common_tags["Environment"]}api.${var.main_domain}"
  type       = "A"

  alias {
    name                   = "${aws_lb.api.dns_name}"
    zone_id                = "${aws_lb.api.zone_id}"
    evaluate_target_health = false
  }
}

