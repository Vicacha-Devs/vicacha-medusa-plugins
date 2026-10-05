import { ConfigModule, MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { BoldBaseOptions } from "@payment-bold/types"

interface ModulesOptionsConfigWithBoldProvider { 
    options: { 
        providers?: Array<{ 
            id: string; 
            resolve: string; 
            options: BoldBaseOptions;
        }> 
    }
}

export function getProviderOptionsFromContainer(container: MedusaContainer): BoldBaseOptions {
  // 1. Resolve configModule from container
  const configModule = container.resolve<ConfigModule>(ContainerRegistrationKeys.CONFIG_MODULE)

  // 2. Safely extract payment module options
  const paymentModuleConfig = configModule?.modules?.payment as unknown as ModulesOptionsConfigWithBoldProvider
    | undefined

  const providers = paymentModuleConfig?.options?.providers

  if (!paymentModuleConfig || !Array.isArray(providers)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The Payment Module is not configured in medusa-config.ts. Please register '@medusajs/medusa/payment' under modules in your project configuration."
    )
  }

  // 3. Find the Bold provider entry in the providers array
  const boldProvider = providers.find((p) => p.id && p.id.includes("bold"))

  if (!boldProvider || !boldProvider.options) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Unable to resolve Bold Payment Provider options. Please ensure a payment provider with an ID containing 'bold' (e.g., 'pp_bold-link') is configured in medusa-config.ts under modules.payment.options.providers."
    )
  }

  // 4. Return merged options prioritizing medusa-config options with process.env fallbacks
  const options = boldProvider.options

  return options
}
