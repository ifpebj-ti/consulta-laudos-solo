locals {
  app_name = "meu-app-simples"
}

module "network" {
  source      = "../../modules/network"
  app_name    = local.app_name
  vpc_cidr    = "10.0.0.0/16"
  subnet_cidr = "10.0.1.0/24"
}

module "compute" {
  source            = "../../modules/compute"
  app_name          = local.app_name
  instance_type     = "c7i-flex.large"
  subnet_id         = module.network.public_subnet_id
  security_group_id = module.network.app_sg_id
}

output "application_url" {
  value       = "http://${module.compute.public_ip}"
  description = "URL publica da aplicacao"
}