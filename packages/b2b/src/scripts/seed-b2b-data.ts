import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  MedusaError,
  ModuleRegistrationName,
} from "@medusajs/framework/utils";

export default async function seed_b2b_data({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(
    ContainerRegistrationKeys.LOGGER
  );

  const customerModuleService = container.resolve(
    ModuleRegistrationName.CUSTOMER
  );

  const salesChannelModuleService = container.resolve(
    ModuleRegistrationName.SALES_CHANNEL
  );

  // ---------------------------------------------------------------------------
  // Customer Groups
  // ---------------------------------------------------------------------------

  logger.info("Ensuring B2B/B2C customer groups exist...");

  const existingCustomerGroups =
    await customerModuleService.listCustomerGroups({
      name: {
        $in: ["B2C", "B2B"],
      }
    });

  const existingB2C = existingCustomerGroups.find(
    (group) => group.name === "B2C"
  );

  const existingB2B = existingCustomerGroups.find(
    (group) => group.name === "B2B"
  );

  const customerGroupsToCreate: { name: string }[] = [];

  if (!existingB2C) {
    customerGroupsToCreate.push({
      name: "B2C",
    });
  }

  if (!existingB2B) {
    customerGroupsToCreate.push({
      name: "B2B",
    });
  }

  if (customerGroupsToCreate.length) {
    await customerModuleService.createCustomerGroups(
      customerGroupsToCreate
    );
  }

  const customerGroups =
    await customerModuleService.listCustomerGroups({
      name: {
        $in: ["B2C", "B2B"],
      }
    });

  const b2cCustomerGroup = customerGroups.find(
    (group) => group.name === "B2C"
  );

  const b2bCustomerGroup = customerGroups.find(
    (group) => group.name === "B2B"
  );

  if (!b2cCustomerGroup || !b2bCustomerGroup) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "Failed to create/find B2B/B2C customer groups."
    );
  }

  logger.info(
    `B2C customer group: ${b2cCustomerGroup.id}`
  );

  logger.info(
    `B2B customer group: ${b2bCustomerGroup.id}`
  );

  // ---------------------------------------------------------------------------
  // Sales Channels
  // ---------------------------------------------------------------------------

  logger.info("Ensuring B2B/B2C sales channels exist...");

  const existingSalesChannels =
    await salesChannelModuleService.listSalesChannels({
      name: ["B2C", "B2B"],
    });

  const existingB2CSalesChannel =
    existingSalesChannels.find(
      (channel) => channel.name === "B2C"
    );

  const existingB2BSalesChannel =
    existingSalesChannels.find(
      (channel) => channel.name === "B2B"
    );

  const salesChannelsToCreate: { name: string; description: string }[] = [];

  if (!existingB2CSalesChannel) {
    salesChannelsToCreate.push({
      name: "B2C",
      description: "Sales channel for B2C customers.",
    });
  }

  if (!existingB2BSalesChannel) {
    salesChannelsToCreate.push({
      name: "B2B",
      description: "Sales channel for B2B customers.",
    });
  }

  if (salesChannelsToCreate.length) {
    await salesChannelModuleService.createSalesChannels(
      salesChannelsToCreate
    );
  }

  const salesChannels =
    await salesChannelModuleService.listSalesChannels({
      name: ["B2C", "B2B"],
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
      "Failed to create/find B2B/B2C sales channels."
    );
  }

  logger.info(
    `B2C sales channel: ${b2cSalesChannel.id}`
  );

  logger.info(
    `B2B sales channel: ${b2bSalesChannel.id}`
  );

  logger.info("Finished creating B2B/B2C data.");
}