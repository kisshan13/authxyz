import Local from "./authentic/local.js";

const exauth = {
  Local,
};

const local = new Local({ secret: "sadsad", adapter: "any" });

export default exauth;
