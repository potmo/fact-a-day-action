"use strict";
const github = require('octonode');
const core = require('@actions/core');
const githubAPI = require('@actions/github');

run()
.then(()=>{
  console.log('done');
})
.catch((err)=>{
  console.error(`error: ${err.stack}`);
  core.setFailed(error.message);
});


//WARNING: DO NOT COMMIT
async function run() {

  const specific_issue_id_to_publish = core.getInput('issue_id');
  const token = core.getInput('API_TOKEN');
  console.log(`Will publish: ${specific_issue_id_to_publish ? specific_issue_id_to_publish : 'first best'}!`);
  
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(githubAPI.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);


  let {client, repo} = await login(token, 'potmo/fact-a-day');
  
  let current_issues = await getCurrentIssues(client, repo);

  let unused_issues = await getUnusedIssues(client, repo);
  
  if (unused_issues.length == 0) {
    throw new Error("No unused issues");
  }

  // take first
  let unused_issue = unused_issues[0];

  let published_issue = await publishIssue(client, repo, unused_issue)

  unpublishIssues(client, repo, current_issues);

  console.log(`new issue has title: ${published_issue.title} and body ${published_issue.body}`)

  core.setOutput("message", `new issue has title: ${published_issue.title} and body ${published_issue.body}`);

}

async function login(token, repo_name) {
  console.log(`logging into ${repo_name}`);
  let client = github.client(token);
  let repo = client.repo(repo_name);
  return {client, repo};
}

async function unpublishIssues(client, repo, issues) {
  let issue_ids = issues.map(a => a.number);
  console.log(`unpublishing issues [${issue_ids.join(', ')}] of ${repo.name}`);
  for (let id of issue_ids) {
    await unpublishIssue(client, repo, id);
  }
}

async function unpublishIssue(client, repo, issue_id) {
  console.log(`unpublishing issue ${issue_id} of ${repo.name}`);
  let issue = repo.issue(issue_id);
  await issue.removeLabelAsync('current');
}

async function publishIssue(client, repo, issue_data) {

  console.log(`publishing issue ${issue_data.number} of ${repo.name}`);
  //let result = await repo.issue(issue_id).infoAsync();
  //let modified = await result.createCommentAsync({body: 'Test Comment'});
  //console.log(`issue: ${result}`, result)
 // console.log(modified)

  let issue = repo.issue(issue_data.number);

  await issue.createCommentAsync({body: `Publishing as of ${new Date().toISOString()}`});
  //await issue.updateAsync({state: 'closed'});
  await issue.addLabelsAsync(['published', 'current']);

  return issue_data;
}

async function getUnusedIssues(client, repo) {

  console.log(`loading unused issues for ${repo.name}`);
  
  let response = await client.search().issuesAsync({
    q: `state:open+repo:${repo.name}+is:open+-label:published+-label:holdback`,
    sort: 'created',
    order: 'asc'
  });

  let issues = response[0].items;
  return issues;
}

async function getCurrentIssues(client, repo) {

  console.log(`loading current issues for ${repo.name}`);
  
  let response = await client.search().issuesAsync({
    q: `state:open+repo:${repo.name}+is:open+label:published+label:current`,
    sort: 'created',
    order: 'asc'
  });

  let issues = response[0].items;
  return issues;
}


