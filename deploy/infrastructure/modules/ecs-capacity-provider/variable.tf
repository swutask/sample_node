variable "name" {
    type = string
}
variable "autoscaling_group_arn" {
  type = string
}

variable "max_size" {
  type = number
}
variable "min_size" {
  type = number
}