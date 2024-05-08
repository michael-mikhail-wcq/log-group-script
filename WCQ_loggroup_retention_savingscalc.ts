import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as util from 'util';
// Credentials
AWS.config.region = 'ap-southeast-2';
const credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'ap-southeast-2:',
});
const locationClient = new AWS.Location({
    credentials,
});
const cloudwatchlogs: AWS.CloudWatchLogs = new AWS.CloudWatchLogs();

// Function to retrieve all the log groups
async function getAllLogGroups(): Promise<string[]> {
    const logGroups: string[] = [];
    let nextToken;

    do {
        const params: AWS.CloudWatchLogs.DescribeLogGroupsRequest = {
            nextToken,
        };

        const data: AWS.CloudWatchLogs.DescribeLogGroupsResponse = await cloudwatchlogs.describeLogGroups(params).promise();

        if (data.logGroups) {
            data.logGroups.forEach((logGroup: AWS.CloudWatchLogs.LogGroup) => {
                logGroups.push(logGroup.logGroupName as string);
            });
        }
        nextToken = data.nextToken;
    } while (nextToken);

    return logGroups;
}
// Function for printing out Log Group details
async function getLogGroupDetails(logGroupName: string): Promise<AWS.CloudWatchLogs.LogGroup | null> {
    const params: AWS.CloudWatchLogs.DescribeLogGroupsRequest = {
        logGroupNamePrefix: logGroupName
    };

    const data: AWS.CloudWatchLogs.DescribeLogGroupsResponse = await cloudwatchlogs.describeLogGroups(params).promise();

    if (data.logGroups) {
        return data.logGroups.find((group: AWS.CloudWatchLogs.LogGroup) => group.logGroupName === logGroupName) || null;
    }

    return null;
}

// Function to set retention to 3 days for each log group
async function setRetention(logGroupName: string): Promise<void> {
    const params: AWS.CloudWatchLogs.PutRetentionPolicyRequest = {
        logGroupName,
        retentionInDays: 3
    };

    await cloudwatchlogs.putRetentionPolicy(params).promise();
    console.log(`Updated retention period for "${logGroupName}" to THREE days.`);
}

// Point to main function to print the logs to the textfile
async function main(): Promise<void> {
    try {
        const logGroups: string[] = await getAllLogGroups();

        const logsWithoutRetention: AWS.CloudWatchLogs.LogGroup[] = [];

        for (const logGroupName of logGroups) {
            const logGroupDetails: AWS.CloudWatchLogs.LogGroup | null = await getLogGroupDetails(logGroupName);
            if (logGroupDetails && logGroupDetails.retentionInDays === undefined) {
                logsWithoutRetention.push(logGroupDetails);
                // Set retention policy for this log group
                await setRetention(logGroupName);
            }
        }
        const changedLogGroupsCount = logsWithoutRetention.length;
        const costSavings = estimateCostSavings(logGroups);

        // Get the AWS account ID
        const accountId = await getAccountId();
        const fileName = `loggroups-noretention-${accountId}.txt`;
        const writeFile = util.promisify(fs.writeFile);
        await writeFile(fileName, `Number of Loggroups with an UPDATED Retention: ${changedLogGroupsCount}\n\n` +
                  `Estimated cost savings after retention policy: $${costSavings.toFixed(2)} per month\n\n` +

            `Log groups with a recently applied 3 day retention:\n${JSON.stringify(logsWithoutRetention, null, 2)}\n\n`, 'utf8');

        console.log(`Log groups without retention have been saved to ${fileName}`);
    } catch (err) {
        console.error('Error:', err);
    }
}
// Function to estimate cost savings after retention policy
function estimateCostSavings(logGroups: string[]): number {
    // Assume average daily data volume ingested in GB
    const avgDailyDataVolumeGB = 100;

    // $0.03 per GB a month 
    const storageCostPerGBMonth = 0.03;

    // Current storage cost without retention policy
    const currentStorageCost = avgDailyDataVolumeGB * 30 * storageCostPerGBMonth; 

    // Calculate potential storage cost with retention policy (applying the 3 day retention)
    const retentionStorageCost = (avgDailyDataVolumeGB * 3 * storageCostPerGBMonth) * logGroups.length; 

    // total savings
    const costSavings = currentStorageCost - retentionStorageCost;

    return costSavings;
}

// Get AWS account ID
async function getAccountId(): Promise<string> {
    const sts = new AWS.STS();
    const data = await sts.getCallerIdentity({}).promise();
    return data.Account || '';
}

// Run the main function
main();
