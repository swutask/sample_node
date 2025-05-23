locals {
  # Automatically load environment-level variables
  environment_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  region_vars      = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  # Extract out common variables for reuse
  env        = local.environment_vars.locals.environment
  project    = local.environment_vars.locals.project
  aws_region = local.region_vars.locals.aws_region
}
terraform {
  source = "git::git@github.com:terraform-aws-modules/terraform-aws-autoscaling.git?ref=v3.5.0"
}

inputs = {
  name                                        = "asg-${local.env}-${local.project}"
  lc_name                                     = "lc-${local.env}-${local.project}"
  associate_public_ip_address                 = true
  recreate_asg_when_lc_changes                = true
  create_asg_with_initial_lifecycle_hook      = true
  initial_lifecycle_hook_name                 = "ExampleLifeCycleHook"
  initial_lifecycle_hook_lifecycle_transition = "autoscaling:EC2_INSTANCE_TERMINATING"
  initial_lifecycle_hook_default_result       = "CONTINUE"
  default_cooldown                            = 100

  # This could be a rendered data resource
  initial_lifecycle_hook_notification_metadata = <<EOF
  {
    "Name": "Launch"
  }
   EOF

  image_id             = "ami-0b503183199b31416" //dependency.aws-data.outputs.ubuntu_1804_aws_ami_id
  key_name             = dependency.ssh-key.outputs.this_key_pair_key_name
  instance_type        = local.environment_vars.locals.instance_type
  security_groups      = [dependency.sg-ec2.outputs.this_security_group_id]
  iam_instance_profile = dependency.ec2-profile.outputs.this_iam_instance_profile_id
  user_data            = dependency.init-script.outputs.user_data_rendered

  target_group_arns = flatten([dependency.alb.outputs.target_group_arns])

  root_block_device = [
    {
      volume_size = local.environment_vars.locals.volume_size
      volume_type = "gp2"
    },
  ]

  # Auto scaling group
  asg_name                  = "asg-${local.env}-${local.project}"
  vpc_zone_identifier       = dependency.vpc.outputs.public_subnets
  health_check_type         = "EC2"
  spot_price                = local.environment_vars.locals.spot_price
  min_size                  = 2
  max_size                  = 4
  desired_capacity          = 2
  wait_for_capacity_timeout = 0

  tags = [
    {
      key                 = "Environment"
      value               = "${local.env}"
      propagate_at_launch = true
    },
    {
      key                 = "Project"
      value               = "${local.project}"
      propagate_at_launch = true
    },
  ]
}


include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../vpc", "../sg-ec2", "../aws-data", "../ssh-key", "../alb", "../ec2-profile", "../init-script"]
}

dependency "vpc" {
  config_path = "../vpc"
}

dependency "sg-ec2" {
  config_path = "../sg-ec2"
}

dependency "alb" {
  config_path = "../alb"
}


dependency "ssh-key" {
  config_path = "../ssh-key"
}

dependency "aws-data" {
  config_path = "../aws-data"
}

dependency "ec2-profile" {
  config_path = "../ec2-profile"
}

dependency "init-script" {
  config_path = "../init-script"
}
