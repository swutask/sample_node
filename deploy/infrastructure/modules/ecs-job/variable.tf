variable "log_group_name" {
    type = string
    description = "(optional) describe your variable"
}

variable "app_name" {
    type = string
    description = "(optional) describe your variable"
}

variable "node_env" {
    type = string
    description = "NODE_ENV variable for container"
}
variable "image" {
    type = string
    description = "(optional) describe your variable"
}

variable "aws_region" {
    type = string
    description = "(optional) describe your variable"
}

variable "cluster_arn" {
    type = string
    description = "(optional) describe your variable"
}

variable "desired_count" {
    type = number
    description = "(optional) describe your variable"
}

variable "role_arn" {
  type = string
}

variable "min_size" {
  type = number
}

variable "max_size" {
  type = number
}

# variable "lambda_endpoint" {
#   type = string
# }

variable "capacity_provider_name" {
  type = string
}

variable "memory" {
  type = number
}

variable "command" {
  type = string
}

variable "subnets" {
  type        = list(string)
  default     = [""]
}

variable "security_groups" {
  type        = list(string)
  default     = [""]
}

# variable "namespace_id" {
#   type = string
#   default = ""
# }

variable "metrics_path" {
  type = string
  default = "/metrics"
}

variable "metrics_port" {
  type = number
  default = 9090
}