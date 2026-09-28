variable "app_name" {
  description = "Nome base da aplicacao"
  type        = string
  default     = "consulta-laudos-solos"
}

variable "vpc_cidr" {
  description = "CIDR block para a VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR block para a Subnet Pública"
  type        = string
  default     = "10.0.1.0/24"
}