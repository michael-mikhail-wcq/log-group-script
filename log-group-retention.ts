const AWS = require('aws-sdk');
// Configure the AWS SDK with both region and credentials
AWS.config.update({ 
    region: 'ap-southeast-2', 
    credentials: 
        { accessKeyId: '', 
            secretAccessKey: '' } });

// Create CloudWatchLogs service object
const cloudwatchlogs = new AWS.CloudWatchLogs();

// Function to retrieve all the log groups
async function getAllLogGroups(): Promise<string[]> {
    const logGroups: string[] = [];
    let nextToken: string | undefined = undefined;
    
    do {
        const params: AWS.CloudWatchLogs.DescribeLogGroupsRequest = {
            nextToken,
        };
        
        const data = await cloudwatchlogs.describeLogGroups(params).promise();
        
        if (data.logGroups) {
            data.logGroups.forEach(logGroup => {
                logGroups.push(logGroup.logGroupName!);
            });
        }
        
        nextToken = data.nextToken;
    } while (nextToken);
    
    return logGroups;
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

// Function to check if retention is already set for a log group
async function isRetentionSet(logGroupName: string): Promise<boolean> {
    const params: AWS.CloudWatchLogs.DescribeLogGroupsRequest = {
        logGroupNamePrefix: logGroupName
    };

    const data = await cloudwatchlogs.describeLogGroups(params).promise();

    if (data.logGroups) {
        const logGroup = data.logGroups.find(group => group.logGroupName === logGroupName);
        if (logGroup && logGroup.retentionInDays !== undefined) {
            console.log(`Retention already configured for log group "${logGroupName}".`);
            return true;
        }
    }

    return false;
}
// Main function to set retention for all log groups as per requirements
async function main() {
    try {
        const logGroups = await getAllLogGroups();
        
        for (const logGroupName of logGroups) {
            const retentionSet = await isRetentionSet(logGroupName);
            if (!retentionSet) {
                await setRetention(logGroupName);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    }
}
// Run the main function
main();
