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
  source = "git::git@github.com:cloudposse/terraform-aws-ecr.git//.?ref=0.32.3"
}
inputs = {
  environment              = "test"
  name                     = "${local.project}"
  image_tag_mutability     = "MUTABLE"
  max_image_count          = 5
  scan_images_on_push      = false
  tags = {
  "Project" = local.project
  }  
}


include {
  path = find_in_parent_folders()
}
