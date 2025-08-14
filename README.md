A mirror of a private GitLab repository.

# How to run the code

You need to have a Discord bot account (https://discord.com/developers/docs/getting-started) and a Discord server to test it on.

-   Install npm (on Debian/Ubuntu: `sudo apt install npm`).
-   Install libraries (`npm install`).
-   Create a `.env` file with the following information:

```
token = "[token of your Discord bot]"
clientID = "[client ID of your Discord bot]"
guildID = "[guild ID of yourn Discord server]"
```

# How to contribute

Write to `npigeons` to gain access to the main GitLab repository.

We work in Visual Studio Code, with extension [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode).

If you're doing it for the first time:

-   Generate an SSH key (unless you already have one) by using `ssh-keygen`.
-   Add your public SSH key to GitLab (User Settings, SSH Keys).
-   Clone the repository: `git clone git@gitlab.com:npigeons/gif-pigeon.git`.

Then (or if you have already cloned the repository):

```console
git checkout testing-server
git pull
git checkout -b my-new-branch
```

Now you can work on the code; when you finish working, review your changes with `git status` and `git diff`.

If they look alright, run

```
git add .
git commit -m "short description of changes"
git --set-upstream origin push
```

If the last command gives you an error, try `git push` and see what it says.

Then, Git will give you a link to create a merge request (or you can do it on GitLab website).
