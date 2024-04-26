import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as util from 'util';

AWS.config.update({
    region: 'ap-southeast-2'
});

const cloudwatchlogs: AWS.CloudWatchLogs = new AWS.CloudWatchLogs();

// function to retrieve all the log groups
async function getAllLogGroups(): Promise<string[]> {
    const logGroups: string[] = [];
    let nextToken;

    do {
        const params: AWS.CloudWatchLogs.DescribeLogGroupsRequest = {
            nextToken,
        };

        const data: AWS.CloudWatchLogs.DescribeLogGroupsResponse = await cloudwatchlogs.describeLogGroups(params).promise();

        if (data.logGroups) {
            data.logGroups.map((logGroup: AWS.CloudWatchLogs.LogGroup) => {
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

// point to main function to print the logs to the textfile
async function main(): Promise<void> {
    try {
        const logGroups: string[] = await getAllLogGroups();

        const logsWithoutRetention: AWS.CloudWatchLogs.LogGroup[] = [];

        for (const logGroupName of logGroups) {
            const logGroupDetails: AWS.CloudWatchLogs.LogGroup | null = await getLogGroupDetails(logGroupName);
            if (logGroupDetails && logGroupDetails.retentionInDays === undefined) {
                logsWithoutRetention.push(logGroupDetails);
            }
        }

        // creating txt file to print loggroups without retention
        const fileName = 'loggroups-noretention.txt';
        const writeFile = util.promisify(fs.writeFile);
        await writeFile(fileName, JSON.stringify(logsWithoutRetention, null, 2), 'utf8');

        console.log(`Log groups without retention have been saved to ${fileName}`);
    } catch (err) {
        console.error('Error:', err);
    }
}

// run the main function
main();
