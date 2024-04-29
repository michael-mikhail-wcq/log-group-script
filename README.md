**To run the script, follow these steps:**

1. First, compile the TypeScript file into JavaScript by running the following command:

   ```
   tsc /log-group-retention.ts
   ```


2. Once the TypeScript file is compiled, use Node.js to execute the JavaScript file:

   ```
   node /log-group-retention.js
   ```



**Note:** Before running the script, ensure that you have provided your AWS credentials. These credentials are necessary for the script to interact with AWS services.


For tester script that prints log groups with no retention to a txt file:

   ```
   tsc /WCQ-log-retention-file-test.ts
   ```
   ```
   node /WCQ-log-retention-file-test.js
   ```
