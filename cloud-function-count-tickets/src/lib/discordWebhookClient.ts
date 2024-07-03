import { Webhook, MessageBuilder } from "discord-webhook-node";
import { IParsedMessageDataWithoutErrors } from "../types";

class DiscordWebhookClient {
  client: Webhook;

  /**
   * Creates a new DiscordWebhookClient instance.
   * @param webhookURL - The URL of the Discord webhook to send messages to
   */
  constructor(webhookURL: string) {
    this.client = new Webhook(webhookURL);
  }

  /**
   * Reports the total number of ticket sales to the Discord webhook.
   * @param totalTickets - The total number of tickets sold
   * @param latestSale - The latest ticket sale data
   */
  async reportNewSales(
    totalTickets: number,
    latestSale: IParsedMessageDataWithoutErrors
  ): Promise<void> {
    const embed = new MessageBuilder()
      .setTitle(":money_mouth: New Ticket Sales! :money_mouth:")
      .addField("Date", latestSale.date.toLocaleString(), true)
      .addField("# Sold", latestSale.ticketCount.toString(), true)
      .setFooter(`TOTAL TICKETS SOLD: ${totalTickets} / 200`);

    return this.client.send(embed);
  }
}

export default DiscordWebhookClient;
