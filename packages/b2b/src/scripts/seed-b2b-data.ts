import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  MedusaError,
  ModuleRegistrationName,
} from "@medusajs/framework/utils";
import { createSalesChannelsWorkflow } from "@medusajs/medusa/core-flows";

export default async function seed_b2b_data({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const customerModuleService = container.resolve(
    ModuleRegistrationName.CUSTOMER
  );

  logger.info("Creating B2B/B2C customer groups...");

  const customerGroups = await customerModuleService.createCustomerGroups([
    {
      name: "B2C",
    },
    {
      name: "B2B",
    },
  ]);

  const b2cCustomerGroup = customerGroups.find(
    (group) => group.name === "B2C"
  );

  const b2bCustomerGroup = customerGroups.find(
    (group) => group.name === "B2B"
  );

  if (!b2cCustomerGroup || !b2bCustomerGroup) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "Failed to create B2B/B2C customer groups."
    );
  }

  logger.info(`Created B2C customer group: ${b2cCustomerGroup.id}`);
  logger.info(`Created B2B customer group: ${b2bCustomerGroup.id}`);

  logger.info("Creating B2B/B2C sales channels...");

  const { result: salesChannels } = await createSalesChannelsWorkflow(
    container
  ).run({
    input: {
      salesChannelsData: [
        {
          name: "B2C",
          description: "Sales channel for B2C customers.",
        },
        {
          name: "B2B",
          description: "Sales channel for B2B customers.",
        },
      ],
    },
  });

  const b2cSalesChannel = salesChannels.find(
    (channel) => channel.name === "B2C"
  );

  const b2bSalesChannel = salesChannels.find(
    (channel) => channel.name === "B2B"
  );

  if (!b2cSalesChannel || !b2bSalesChannel) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "Failed to create B2B/B2C sales channels."
    );
  }

  logger.info(`Created B2C sales channel: ${b2cSalesChannel.id}`);
  logger.info(`Created B2B sales channel: ${b2bSalesChannel.id}`);

  logger.info("Finished creating B2B/B2C data.");
}