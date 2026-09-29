variable "app_name" {
  description = "Nome da aplicacao"
  type        = string
  default     = "consulta-laudos-solos"
}

variable "instance_type" {
  description = "Tipo da instancia EC2"
  type        = string
  default     = "c7i-flex.large"
}

variable "subnet_id" {
  description = "ID da Subnet Publica"
  type        = string
}

variable "security_group_id" {
  description = "ID do Security Group"
  type        = string
}