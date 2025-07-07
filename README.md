# DynamoDB Write Demand Distribution

This project demonstrates two different approaches to handling write spikes in DynamoDB and compares their impact on write capacity consumption patterns.

## What This Example Demonstrates

### Problem

When applications experience sudden write spikes, DynamoDB can throttle requests if the write capacity is exceeded. This leads to failed writes, retries, and poor user experience.

### Solution Comparison

This project compares two approaches:

1. **Direct Batch Writes**: Writing directly to DynamoDB using batch operations
2. **SQS-Buffered Writes**: Using SQS as a buffer to spread write load over time

### Key Learning Outcomes

- **Write Pattern Analysis**: Visualize how different approaches affect DynamoDB write capacity consumption
- **Load Distribution**: See how SQS can smooth out write spikes by distributing messages over time
- **Cost Implications**: Compare the costs of provisioned capacity vs. on-demand scaling
- **Monitoring**: Learn to monitor write capacity usage through CloudWatch dashboards

## Architecture

The AWS CDK stack deploys:

- **2 DynamoDB Tables**: One for each write approach (batch vs. queue-based)
- **3 Lambda Functions**:
  - `dynamodb-batch`: Writes 1000 records directly to DynamoDB in batches
  - `queue-producer`: Sends 1000 messages to SQS with calculated delays for even distribution
  - `queue-consumer`: Processes SQS messages and writes to DynamoDB
- **1 SQS Queue**: Buffers write operations with configurable delay
- **CloudWatch Dashboard**: Displays write capacity units for both tables side-by-side

## How It Works

### Data Generation

Both approaches use the same mock dataset (1000 records from `MOCK_DATA.csv`), enriched with:

- Unique identifier (`pk`) using `kuid()`
- Timestamp (`sk`) using `Date.now()`

### Execution Schedule

- Both producer functions run every 10 minutes via CloudWatch Events
- This simulates periodic write spikes that applications might experience

### Write Distribution

- **Batch approach**: All 1000 records written immediately in 40 batches of 25 items
- **Queue approach**: Messages distributed evenly across 15 minutes using calculated delays

## Setup and Usage

### Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js and npm installed
- AWS CDK CLI installed (`npm install -g aws-cdk`)

### Deployment

```bash
cd infrastructure
npm install
npm run build
cdk deploy
```

### Monitoring

After deployment, check the CloudWatch dashboard to observe:

- Write capacity consumption patterns
- Differences between batch and queue-based approaches
- How SQS helps distribute write load over time

### Adjusting Write Distribution

Modify the distribution window in `./handlers/queue-producer/index.ts`:

```typescript
const distributionWindow = 900; // 15 minutes in seconds
```

## Cost Considerations

⚠️ **This project incurs AWS costs** including:

- Lambda function executions
- DynamoDB write capacity units
- SQS message processing
- CloudWatch dashboard and metrics

**To avoid ongoing charges, always run:**

```bash
cdk destroy
```

## Key Files

- `infrastructure/lib/infrastructure-stack.ts`: Complete AWS resource definitions
- `handlers/dynamodb-batch/index.ts`: Direct DynamoDB batch writer
- `handlers/queue-producer/index.ts`: SQS message producer with even distribution
- `handlers/queue-consumer/index.ts`: SQS message consumer and DynamoDB writer
