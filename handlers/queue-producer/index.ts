import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

import kuid from 'kuid';
import { readFileSync } from 'node:fs';

function setup() {
  const csv = readFileSync('./MOCK_DATA.csv').toString();
  const lines = csv.split('\n');
  const header = lines.shift()!.split(',');

  return lines.map((line) => line.split(','))
    .filter((line) => line.length === header.length)
    .map((values) => {
      const data: any = {};
      values.forEach((value, i) => {
        data[header[i]] = value.replace('\n', '');
      });
      return data;
    })
    .map(data => {
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

const queueUrl = process.env.QUEUE_URL as string;

const client = new SQSClient();

export const handler = async () => {
  let i = 0;

  for (const messages of chunk(data, 10)) {
    const command = new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: messages.map((message, j) => ({
        DelaySeconds: i * j, // modify this so adjust write demand
        Id: message.pk,
        MessageBody: JSON.stringify(message)
      })),
    });

    await client.send(command);

    i++;
  }
}
