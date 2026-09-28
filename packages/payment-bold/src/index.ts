import { ModuleProviderExports } from "@medusajs/framework/types"
import { BoldOnlinePaymentProviderService } from "./providers/bold-online"
import { BoldLinkPaymentProviderService} from "./providers/bold-link"
import { BoldButtonPaymentProviderService } from "./providers/bold-button"
import { BoldTerminalPaymentProviderService } from "./providers/bold-terminal"

export * from "./types"
export * from "./types/errors"
export * from "./lib"
export * from "./sdk/client"
export * from "./sdk/query-keys"

export {
    BoldButtonPaymentProviderService,
    BoldLinkPaymentProviderService,
    BoldOnlinePaymentProviderService,
    BoldTerminalPaymentProviderService,
}

const services = [
    BoldButtonPaymentProviderService,
    BoldLinkPaymentProviderService,
    BoldOnlinePaymentProviderService,
    BoldTerminalPaymentProviderService,
]

const providerExports: ModuleProviderExports = {
    services,
}

export default providerExports