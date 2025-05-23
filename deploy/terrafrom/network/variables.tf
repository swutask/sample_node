variable "region" {
  description = "Please Enter AWS Region to deploy Server"
  default     = "eu-central-1"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "env" {
  default = "test"
}


variable "project" {
  default = "helloivy"
}

variable "public_subnet_cidrs" {
  default = [
    "10.0.1.0/24",
    "10.0.2.0/24",
  ]
}
