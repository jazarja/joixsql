# Try it

```sh
yarn
```

then...


Run this code once:
```sh
yarn start
```

It will detect the schema and create the table accordingly if it doesn't exist yet.
<details>
<summary>See output</summary>
<a>
  <img src="https://siasky.net/FAACv7_cINZHSLE436FDYEpuF8p48Su6i9_NZaTLX1dttw" width="50%">
</a>
</details>

<br />

Now update the values of the **Todo object** in **index.ts** :
```ts
...
const Todo = Joi.object({
    id: Joi.number().autoIncrement().primaryKey(),
    title: Joi.string().max(140).default(''),
    content: Joi.string().min(1).max(400).default('This is a new content by default'),
    created_at: Joi.date().default(() => new Date()),
})
...
```

It will detect the schema change and build a table migration automatically.
<details>
<summary>See output</summary>
<a>
  <img src="https://siasky.net/NACRorvs5bzZHxP_l40l9zzNlj_97dW_p-dqwcdi2wdF8Q" width="50%">
</a>
</details>
<details>
<summary>See table description</summary>
<a>
  <img src="https://siasky.net/XADtqS4-UCeawz5Xu6Bq5dPQyLqOLFItjch3d4pWBJwkEA" width="75%">
</a>
</details>
