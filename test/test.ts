import { dev } from "../src/index";
const { reload } = dev(
  { root: "./test/", openBrowser: "edge" },
  {
    dispatch: (url) => {
      console.log(url);

      if (url.startsWith("/")) {
        return {
          host: "news.baidu.com",
          port: 443,
          https: true,
          from: "/",
          to: "/",
          headers: (req) => {
            return {
              "from-url": req.url,
            };
          },
        };
      }
      return null;
    },
  }
);

// dev({ port: 8999 }, [
//   {
//     host: "local",
//     port: 9090,
//     from: "/abcc",
//     to: "/ccab",
//   },
//   {
//     host: "local2",
//     port: 9090,
//     from: "/cccc",
//     to: "/dddd",
//   },
// ]);
