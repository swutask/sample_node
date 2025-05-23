locals {
   # Automatically load environment-level variables
   environment_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
   region_vars = read_terragrunt_config(find_in_parent_folders("region.hcl"))   
   # Extract out common variables for reuse
   env        = local.environment_vars.locals.environment
   project    = local.environment_vars.locals.project
   aws_region = local.region_vars.locals.aws_region
}
terraform {
  source = "git::git@github.com:terraform-aws-modules/terraform-aws-alb.git//.?ref=v6.6.1"
}

inputs = {

  name = "alb-${local.env}-${local.project}"

  load_balancer_type = "application"
  enable_deletion_protection = true
  idle_timeout = 600

  vpc_id          = dependency.vpc.outputs.vpc_id
  security_groups = [dependency.sg-elb.outputs.security_group_id]
  subnets         = dependency.vpc.outputs.public_subnets

  http_tcp_listeners = [
    {
      port        = 80
      protocol    = "HTTP"
      action_type = "redirect"
      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  ]

  https_listeners = [
    {
      port               = 443
      protocol           = "HTTPS"
      certificate_arn    = "arn:aws:acm:eu-central-1:944000130876:certificate/30cde68e-ce9f-49df-a2ce-2487eb0e6724"
    }
  ]

   https_listener_rules = [
    {
      https_listener_index = 0
      priority             = 1

      actions = [
        {
          type               = "forward"
          target_group_index = 0
        }
      ]

      conditions = [{
        host_headers = ["api.helloivy.co"]
      }]
    },
    {
      https_listener_index = 0
      priority             = 2

      actions = [
        {
          type               = "forward"
          target_group_index = 1
        }
      ]

      conditions = [{
        host_headers = ["testapi.helloivy.co"]
      }]
    },
   ],
  target_groups = [
    {
      name_prefix          = "prod"
      backend_protocol     = "HTTP"
      backend_port         = 3001
      target_type          = "instance"
      deregistration_delay = 10
      health_check = {
        enabled             = true
        interval            = 5
        path                = local.environment_vars.locals.health_path
        port                = "traffic-port"
        healthy_threshold   = 2
        unhealthy_threshold = 2
        timeout             = 2
        protocol            = "HTTP"
        matcher             = "200"
      }
    },
    {
      name_prefix          = "test"
      backend_protocol     = "HTTP"
      backend_port         = 3001
      target_type          = "instance"
      deregistration_delay = 10
      health_check = {
        enabled             = true
        interval            = 5
        path                = local.environment_vars.locals.health_path
        port                = "traffic-port"
        healthy_threshold   = 2
        unhealthy_threshold = 2
        timeout             = 2
        protocol            = "HTTP"
        matcher             = "200"
      }
    },
  ]
}


include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../vpc", "../sg-alb"]
}

dependency "vpc" {
  config_path = "../vpc"
}

dependency "sg-elb" {
  config_path = "../sg-alb"
}
