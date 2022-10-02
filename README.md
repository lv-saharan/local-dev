# local-dev

a local dev server with simple api proxy

# install

```bash
npm i local-dev -D
```

# usage

```javascript
import { dev } from "local-dev";
const { reload } = dev({
  port: 9000,
});

//watch on change
setInterval(() => {
  reload("test....");
}, 10000);
```
