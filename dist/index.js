//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
const node_fs = __toESM(require("node:fs"));
const node_path = __toESM(require("node:path"));
const node_process = __toESM(require("node:process"));
const __actions_core = __toESM(require("@actions/core"));
const __actions_github = __toESM(require("@actions/github"));
const __actions_exec = __toESM(require("@actions/exec"));

//#region src/utils/common.ts
const SKIP_CHANGELOG_REG = /\[x\] 本条 PR 不需要纳入 Changelog/i;
const CHANGELOG_REG = /-\s([A-Z]+)(?:\(([A-Z\s_-]*)\))?\s*:\s*(.+)/i;
function addContributor(body, contributor) {
	if (SKIP_CHANGELOG_REG.test(body)) {
		(0, __actions_core.info)(`不需要纳入 Changelog`);
		return body;
	}
	let isSkip = true;
	return body.split("\r\n").map((item) => {
		if ([
			"",
			"<!--",
			"-->"
		].includes(item)) return item;
		if (!isSkip) {
			if (item === "### ☑️ 请求合并前的自查清单") {
				isSkip = true;
				return item;
			}
			if (CHANGELOG_REG.test(item)) return `${item} @${contributor}`;
		}
		if (item === "### 📝 更新日志") isSkip = false;
		return item;
	}).join("\r\n");
}
async function getPkgLatestVersion(packageName) {
	const { stdout } = await (0, __actions_exec.getExecOutput)("npm", [
		"view",
		packageName,
		"version"
	]);
	return stdout.trim();
}
async function bumpIconsVersion(packageManager, repo) {
	if (packageManager === "pnpm") await (0, __actions_exec.exec)("pnpm", [
		"--recursive",
		"update",
		"tdesign-icons-*",
		"--latest"
	], { cwd: `./${repo}` });
	else await (0, __actions_exec.exec)("npx", [
		"npm-check-updates",
		"tdesign-icons-*",
		"-u"
	], { cwd: `./${repo}` });
	await (0, __actions_exec.exec)("git", ["status"], { cwd: `./${repo}` });
}
async function corepackEnable() {
	await (0, __actions_exec.exec)("corepack", ["enable"]);
}

//#endregion
//#region src/utils/git-helper.ts
var GitHelper = class {
	token;
	owner;
	repo;
	repoPath;
	dryRun;
	constructor(context) {
		this.token = context.token;
		this.owner = context.owner;
		this.repo = context.repo;
		this.dryRun = context.dryRun;
		this.repoPath = `./${context.repo}`;
		this.iniConfig();
	}
	iniConfig() {
		(0, __actions_exec.exec)("git", [
			"config",
			"--global",
			"user.name",
			"tdesign-bot"
		]);
		(0, __actions_exec.exec)("git", [
			"config",
			"--global",
			"user.email",
			"tdesign@tencent.com"
		]);
		(0, __actions_exec.exec)("git", [
			"config",
			"--global",
			`url.https://${this.token}@github.com/.insteadOf`,
			"https://github.com/"
		]);
	}
	get repoUrl() {
		return `https://github.com/${this.owner}/${this.repo}.git`;
	}
	async clone(branchName = "develop") {
		await (0, __actions_exec.exec)("ls", ["-al"]);
		await (0, __actions_exec.exec)("git", [
			"clone",
			"-b",
			branchName,
			this.repoUrl,
			this.repoPath
		]);
		await (0, __actions_exec.exec)("ls", ["-al"]);
	}
	async createBranch(branch) {
		await (0, __actions_exec.exec)("git", [
			"checkout",
			"-b",
			branch
		], { cwd: this.repoPath });
	}
	async commit(message) {
		await (0, __actions_exec.exec)("git", [
			"commit",
			"-am",
			message,
			"--no-verify"
		], { cwd: this.repoPath });
	}
	async push(branch) {
		if (this.dryRun) {
			(0, __actions_core.info)("dry-run模式, 不运行git push");
			return;
		}
		await (0, __actions_exec.exec)("git", [
			"push",
			"origin",
			branch
		], { cwd: this.repoPath });
	}
	async initSubmodule() {
		await (0, __actions_exec.exec)("git", [
			"submodule",
			"update",
			"--init",
			"--recursive"
		], { cwd: this.repoPath });
	}
	async updateSubmodule() {
		await (0, __actions_exec.exec)("git", [
			"submodule",
			"update",
			"--remote"
		], { cwd: this.repoPath });
	}
	async isNeedCommit() {
		const { stdout } = await (0, __actions_exec.getExecOutput)("git", ["status"], { cwd: this.repoPath });
		return !stdout.includes("nothing to commit, working tree clean");
	}
};

//#endregion
//#region src/utils/github-helper.ts
var GithubHelper = class {
	octokit;
	context;
	dryRun;
	constructor(context) {
		this.context = context;
		this.dryRun = context.dryRun;
		this.octokit = (0, __actions_github.getOctokit)(context.token);
	}
	async getPrData(pr_number) {
		const { data } = await this.octokit.rest.pulls.get({
			owner: this.context.owner,
			repo: this.context.repo,
			pull_number: pr_number
		});
		return data;
	}
	async createPR(title, head, body, base) {
		if (this.dryRun) {
			(0, __actions_core.startGroup)("dry-run模式, 不运行createPR");
			(0, __actions_core.info)(`title: ${title}`);
			(0, __actions_core.info)(`head: ${head}`);
			(0, __actions_core.info)(`base: ${base}`);
			(0, __actions_core.info)(`body: ${body}`);
			(0, __actions_core.endGroup)();
			return;
		}
		const { data } = await this.octokit.rest.pulls.create({
			owner: this.context.owner,
			repo: this.context.repo,
			title,
			head,
			base: base || "develop",
			body
		});
		return data;
	}
	async addComment(pr_number, body) {
		if (this.dryRun) {
			(0, __actions_core.startGroup)("dry-run模式, 不运行addComment");
			(0, __actions_core.info)(`pr_number: ${pr_number}`);
			(0, __actions_core.info)(`body: ${body}`);
			(0, __actions_core.endGroup)();
			return;
		}
		const { data } = await this.octokit.rest.issues.createComment({
			owner: this.context.owner,
			repo: this.context.repo,
			issue_number: pr_number,
			body
		});
		return data;
	}
};

//#endregion
//#region src/tdesign/common.ts
async function start$1(context) {
	if (!Reflect.has(repoMap, context.trigger)) {
		(0, __actions_core.info)(`错误的trigger: ${context.trigger}`);
		return;
	}
	const githubHelper = new GithubHelper({
		repo: context.repo,
		owner: context.owner,
		token: context.token,
		dryRun: context.dry_run
	});
	const prData = await githubHelper.getPrData(context.pr_number);
	if (!prData.merged) {
		(0, __actions_core.info)("pr has been merged");
		githubHelper.addComment(context.pr_number, "PR 还没合并，无法触发");
		return;
	}
	const body = addContributor(prData.body || "", prData.user.login);
	const gitHelper = new GitHelper({
		repo: repoMap[context.trigger],
		owner: ownerMap[context.trigger],
		token: context.token,
		dryRun: context.dry_run
	});
	await gitHelper.clone();
	await gitHelper.initSubmodule();
	await gitHelper.updateSubmodule();
	const branchName = `chore/update-common/pr/${context.pr_number}`;
	await gitHelper.createBranch(branchName);
	const title = `chore(submodule): update common`;
	if (!await gitHelper.isNeedCommit()) {
		(0, __actions_core.info)("nothing to commit");
		return true;
	}
	await gitHelper.commit(title);
	await gitHelper.push(branchName);
	const targetRepo = new GithubHelper({
		repo: repoMap[context.trigger],
		owner: ownerMap[context.trigger],
		token: context.token,
		dryRun: context.dry_run
	});
	const newPrData = await targetRepo.createPR(title, branchName, body);
	if (newPrData) githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n \r\n 创建 PR 成功， 请查看 ${newPrData.html_url}。`);
}

//#endregion
//#region src/tdesign/icons.ts
const CND_ICONFONT_VERSION_REG = /https:\/\/tdesign\.gtimg\.com\/icon\/(\d+\.\d+\.\d+)\/fonts\/index\.css/;
async function getCdnIconfontVersion() {
	const res = await fetch(`https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/vue/src/iconfont/icon.tsx`);
	const text = await res.text();
	const match = text.match(CND_ICONFONT_VERSION_REG);
	return match?.[1] || "";
}
async function miniprogramUpdateIcons(repo, version) {
	await (0, __actions_exec.exec)("node", [
		"./script/update-icons.js",
		"--version",
		version
	], { cwd: `./${repo}` });
	await (0, __actions_exec.exec)("git", ["status"], { cwd: `./${repo}` });
}
async function start(context) {
	if (!Reflect.has(repoMap, context.trigger)) {
		(0, __actions_core.info)(`错误的trigger: ${context.trigger}`);
		return;
	}
	const githubHelper = new GithubHelper({
		repo: context.repo,
		owner: context.owner,
		token: context.token,
		dryRun: context.dry_run
	});
	const prData = await githubHelper.getPrData(context.pr_number);
	const body = addContributor(prData.body || "", prData.user.login);
	(0, __actions_core.startGroup)("body");
	(0, __actions_core.info)(`${body}`);
	(0, __actions_core.endGroup)();
	const packageName = iconsMap[context.trigger];
	(0, __actions_core.startGroup)(packageName);
	let latestVersion = "";
	if (packageName === "cdn-iconfont") latestVersion = await getCdnIconfontVersion();
	else latestVersion = await getPkgLatestVersion(packageName);
	(0, __actions_core.info)(`latestVersion: ${latestVersion}`);
	(0, __actions_core.endGroup)();
	const gitHelper = new GitHelper({
		repo: repoMap[context.trigger],
		owner: ownerMap[context.trigger],
		token: context.token,
		dryRun: context.dry_run
	});
	await gitHelper.clone();
	await gitHelper.initSubmodule();
	const packageManager = packageManagerMap[repoMap[context.trigger]];
	if (packageManager === "pnpm") await corepackEnable();
	await (0, __actions_exec.exec)(packageManager, ["install"], { cwd: `./${repoMap[context.trigger]}` });
	const branchName = `chore/icon/${packageName}/${latestVersion}`;
	await gitHelper.createBranch(branchName);
	await bumpIconsVersion(packageManager, repoMap[context.trigger]);
	if (packageName === "cdn-iconfont") await miniprogramUpdateIcons(repoMap[context.trigger], latestVersion);
	if (!await gitHelper.isNeedCommit()) return true;
	const title = `feat(Icon): upgrade ${packageName} to ${latestVersion}`;
	await gitHelper.commit(title);
	const updateSnapScript = packageName === "cdn-iconfont" ? "test:snap-update" : "test:update";
	await (0, __actions_exec.exec)(packageManager, ["run", updateSnapScript], { cwd: `./${repoMap[context.trigger]}` });
	if (await gitHelper.isNeedCommit()) await gitHelper.commit("chore: update snapshot");
	await gitHelper.push(branchName);
	const targetRepo = new GithubHelper({
		repo: repoMap[context.trigger],
		owner: ownerMap[context.trigger],
		token: context.token,
		dryRun: context.dry_run
	});
	targetRepo.createPR(title, branchName, body);
}

//#endregion
//#region src/utils/trigger.ts
const iconsMap = {
	"/pr-vue": "tdesign-icons-vue",
	"/pr-vue-next": "tdesign-icons-vue-next",
	"/pr-react": "tdesign-icons-react",
	"/pr-mobile-vue": "tdesign-icons-vue-next",
	"/pr-mobile-react": "tdesign-icons-react",
	"/pr-miniprogram": "cdn-iconfont"
};
const repoMap = {
	"/pr-vue": "tdesign-vue",
	"/pr-vue-next": "tdesign-vue-next",
	"/pr-react": "tdesign-react",
	"/pr-mobile-vue": "tdesign-mobile-vue",
	"/pr-mobile-react": "tdesign-mobile-react",
	"/pr-miniprogram": "tdesign-miniprogram",
	"/pr-flutter": "tdesign-flutter"
};
const ownerMap = {
	"/pr-vue": "Tencent",
	"/pr-vue-next": "Tencent",
	"/pr-react": "Tencent",
	"/pr-mobile-vue": "Tencent",
	"/pr-mobile-react": "Tencent",
	"/pr-miniprogram": "Tencent",
	"/pr-flutter": "Tencent"
};
const packageManagerMap = {
	"tdesign-vue": "npm",
	"tdesign-vue-next": "pnpm",
	"tdesign-react": "pnpm",
	"tdesign-mobile-vue": "npm",
	"tdesign-mobile-react": "npm",
	"tdesign-miniprogram": "npm"
};
function useTrigger(context) {
	switch (context.repo) {
		case "tdesign-icons":
			start(context);
			break;
		case "tdesign-common":
			start$1(context);
			break;
		default: throw new Error(`不支持的仓库: ${context.repo}`);
	}
}

//#endregion
//#region src/index.ts
async function run() {
	const repo = __actions_core.getInput("repo") || __actions_github.context.repo.repo;
	const owner = __actions_core.getInput("owner") || __actions_github.context.repo.owner;
	const prNumber = Number(__actions_core.getInput("pr_number")) || __actions_github.context.issue.number;
	const token = __actions_core.getInput("token") || node_process.default.env.GITHUB_TOKEN || "";
	const trigger = __actions_core.getInput("trigger") || __actions_github.context.payload.comment?.body || "";
	const dryRun = Boolean(__actions_core.getInput("dry-run"));
	__actions_core.info(`dryRun: ${dryRun}`);
	if (__actions_github.context.eventName === "issue_comment") {
		__actions_core.info("pr comment trigger");
		if (!__actions_github.context.payload.issue?.pull_request) {
			__actions_core.info("issue_comment not a pull_request comment");
			return;
		}
		const whitelist = (0, node_fs.readFileSync)((0, node_path.resolve)(__dirname, "../.comment-trigger-whitelist"), "utf-8");
		let isWhitelist = false;
		whitelist.split("\n").forEach((item) => {
			if (item.trim() === __actions_github.context.payload.comment?.user.login) {
				__actions_core.info("comment whitelist trigger");
				isWhitelist = true;
			}
		});
		if (!isWhitelist) {
			__actions_core.info(`${__actions_github.context.payload.comment?.user.login}不在白名单内，不触发`);
			return;
		}
	}
	useTrigger({
		owner,
		repo,
		pr_number: prNumber,
		token,
		trigger: trigger.trim(),
		dry_run: dryRun
	});
}
run().catch(console.error);

//#endregion
exports.run = run;