import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";

import kuid from "kuid";
import { readFileSync } from "node:fs";

function setup() {
  const csv = readFileSync("./MOCK_DATA.csv").toString();
  const lines = csv.split("\n");
  const header = lines.shift()!.split(",");

  return lines
    .map((line) => line.split(","))
    .filter((line) => line.length === header.length)
    .map((values) => {
      const data: any = {};
      values.forEach((value, i) => {
        data[header[i]] = value.replace("\n", "");
      });
      return data;
    })
    .map((data) => {
      data.pk = kuid();
      data.sk = +Date.now();
      return data;
    });
}

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
export function* chunk(arr: Array<any>, stride = 25) {
  for (let i = 0; i < arr.length; i += stride) {
    yield arr.slice(i, Math.min(i + stride, arr.length));
  }
}

const data = setup();

const queueUrl = process.env.QUEUE_URL!;

const client = new SQSClient();

const DISTRIBUTION_WINDOW =
  process.env.DISTRIBUTION_WINDOW &&
  !isNaN(parseInt(process.env.DISTRIBUTION_WINDOW))
    ? parseInt(process.env.DISTRIBUTION_WINDOW)
    : 900; // 15 minutes in seconds

export const handler = async () => {
  const chunks = Array.from(chunk(data, 10));
  const totalMessages = data.length;

  // Calculate even distribution: spread all messages across the time window
  const delayIncrement = DISTRIBUTION_WINDOW / totalMessages;

  let messageIndex = 0;

  for (const messages of chunks) {
    const command = new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: messages.map((message) => ({
        DelaySeconds: Math.floor(messageIndex * delayIncrement),
        Id: message.pk,
        MessageBody: JSON.stringify(message),
      })),
    });

    await client.send(command);
    messageIndex += messages.length;
  }
};
