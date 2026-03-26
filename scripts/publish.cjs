#!/usr/bin/env node

const { execSync } = require('child_process');
const { join } = require('path');

const rootDir = join(__dirname, '..');
const version = `v${require(join(rootDir, 'package.json')).version}`;

try {
	process.chdir(rootDir);

	// Verify the version is tagged
	const tags = execSync(`git tag -l ${version}`, { encoding: 'utf8' }).trim();
	if (!tags) {
		console.error(`Error: tag '${version}' not found. Run 'npm run bump' first.`);
		process.exit(1);
	}

	// Ensure working tree is clean
	const staged = execSync('git diff --cached --quiet', { stdio: 'pipe' }).toString();
	const unstaged = execSync('git diff --quiet', { stdio: 'pipe' }).toString();

	console.log(`Publishing ${version} to npm...`);
	execSync('yarn npm publish --access public', { stdio: 'inherit' });

	console.log('Pushing to remote...');
	execSync('git push --follow-tags', { stdio: 'inherit' });

	console.log(`\nPublished ${version}`);
} catch (error) {
	if (error.status && !error.message.includes('npm publish')) {
		// git diff --quiet exits non-zero when there are changes
		console.error('Error: working tree not clean. Commit or stash changes first.');
	} else {
		console.error(`Failed to publish:`, error.message);
	}
	process.exit(1);
}
