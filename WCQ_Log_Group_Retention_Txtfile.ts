import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as util from 'util';

AWS.config.region = 'ap-southeast-2';
const credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'ap-southeast-2:',
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
                // apply retention policy to log group
                await setRetention(logGroupName);
            } else if (logGroupDetails && logGroupDetails.retentionInDays !== undefined) {
                logsWithoutRetention.push(logGroupDetails);
            }
        }

        // Get the number of log groups changed
        const changedLogGroupsCount = logGroups.length - logsWithoutRetention.length;

        // Get the AWS account ID
        const accountId = await getAccountId();
        const fileName = `loggroups-retention-set-${accountId}.txt`;

        // Estimate cost savings
        //const costSavings = estimateCostSavings(logGroups);

        // Write log groups with retention and cost savings to file
        const writeFile = util.promisify(fs.writeFile);
        await writeFile(fileName, `Number of Loggroups that will have a Retention set: ${changedLogGroupsCount}\n\n` +
        `Log groups that have an applied 3 day retention:\n${JSON.stringify(logsWithoutRetention, null,2)}\n\n`, 'utf8');

          //  `Estimated cost savings after retention policy: $${costSavings.toFixed(2)} per month`, 'utf8');

          
        console.log(`Retention period has been set for ${changedLogGroupsCount} log groups. Log groups with retention have been saved to ${fileName}`);
    } catch (err) {
        console.error('Error:', err);
    }
}

// Function for getting AWS account ID
async function getAccountId(): Promise<string> {
    const sts = new AWS.STS();
    const data = await sts.getCallerIdentity({}).promise();
    return data.Account || '';
}

// // Function to estimate cost savings after retention policy
// function estimateCostSavings(logGroups: string[]): number {
//     // Assume average daily data volume ingested in GB
//     const avgDailyDataVolumeGB = 100;

//     // $0.03 per GB a month 
//     const storageCostPerGBMonth = 0.03;

//     // Current storage cost without retention policy
//     const currentStorageCost = avgDailyDataVolumeGB * 30 * storageCostPerGBMonth; 

//     // Calculate potential storage cost with retention policy (applying 3 day retention)
//     const retentionStorageCost = (avgDailyDataVolumeGB * 3 * storageCostPerGBMonth) * logGroups.length; 

//     // total savings
//     const costSavings = currentStorageCost - retentionStorageCost;

//     return costSavings;
// }

// Run the main function
main();
