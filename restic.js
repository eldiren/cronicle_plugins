#!/usr/bin/node

const { spawn } = require("child_process");
const fs = require("fs");

var rl = require("readline").createInterface({ input: process.stdin });

rl.on("line", function (line) {
  var job = JSON.parse(line);
  console.log("Running job: " + job.id);

  var jenv = {
    AWS_ACCESS_KEY_ID: job.params.s3id,
    AWS_SECRET_ACCESS_KEY: job.params.s3secret,
    RESTIC_PROGRESS_FPS: job.params.progressfps,
    RESTIC_PASSWORD: job.params.password,
    RESTIC_REPOSITORY: job.params.repo,
    XDG_CACHE_HOME: "/app/restic_cache",
    PATH: process.env.PATH,
  };

  var cmd = "";
  var args = [];

  if (job.params.ssh) {
    cmd = "/utils/sshpass";
    args = ["-e", "/app/restic", "backup", job.params.folder, "--json", "--verbose"];
    jenv["SSHPASS"] = job.params.sshpass;
  } else {
    cmd = "/app/restic";
    args = ["backup", job.params.folder, "--json", "--verbose"];
  }

  if (job.params.exclude) {
    fs.writeFile("/app/excludes.txt", job.params.excludeoption, (err) => {
      if (err) {
        console.error("Error writing to exlcude file:", err);
        process.stdout.write(JSON.stringify({ complete: 1, code: 1 }) + "\n");
      }
    });

    args.push(`--exclude-file="/app/excludes.txt"`);
  }

  const resticProcess = spawn(cmd, args, { env: jenv });

  resticProcess.stdout.on("data", (data) => {
    try {
      var pdata = JSON.parse(data);
      if (pdata.message_type === "verbose_status")
        console.log(`${pdata.message_type} - ${pdata.action} - ${pdata.item}`);
      else if (pdata.message_type === "status") {
        console.log(JSON.stringify(pdata));

        //process.stdout.write( JSON.stringify({ progress: 0.5 }) + "\n" );
      }
    } catch (err) {
      console.log("Processing...");
    }
    /*
    process.stdout.write(
      JSON.stringify({
        complete: 1,
        code: 0,
      }) + "\n"
    );*/
  });

  resticProcess.stderr.on("data", (data) => {
    console.log("some stderr");
    console.log(JSON.parse(data));
  });

  resticProcess.on("error", (error) => {
    console.log("some error");
    console.log(error);
  });

  resticProcess.on("exit", (code) => {
    process.stdout.write(JSON.stringify({ complete: 1, code }) + "\n");
    console.log("some error");
    console.log(error);
  });

  rl.close();
});
