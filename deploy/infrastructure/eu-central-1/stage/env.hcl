# Set common variables for the environment. This is automatically pulled in in the root terragrunt.hcl configuration to
# feed forward to the child modules.
locals {
  environment                 = "stage"              
  project                     = "complex"  // project name
  // Aplication Load Balancer
  back_end_port               = 3001                // for health checks and ALB
  health_path                 = "/api/health"                 // health check path
  min_size                    = 2
  max_size                    = 4
  
}
