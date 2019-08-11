# Deadbolt 

Just another user authentication library running on Express and Typescript. This project mainly exists to satisfy my curiosity around Express, Typescript, testing, databases, etc.

## Supported settings

All settings can be set through environment variables or a `.env` file in the root of the project. If a settings exists in both, the environment variable will be used.

- PORT - Which port to let Express listen on.
- DB_HOST - Mysql server host
- DB_USER - Mysql server user
- DB_PASS - Mysql server password
- DB_PORT - Mysql server port
- DB_NAME - Mysql Database name

## To develop

```sh
# Start a development server that watches for changes.
npm run serve 
```

## To run for realsies

```sh
# Start transpiled version of the app
npm run start
```

## To test

```sh
# Start transpiled version of the app
npm test
```

## todo

Add routes that call the appropriate things.
Code coverage
Make Docker container to build and run.
Add Social Logins
- Google
- Facebook? :(


