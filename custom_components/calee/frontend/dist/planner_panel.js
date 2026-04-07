/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$2 = globalThis, e$4 = t$2.ShadowRoot && (void 0 === t$2.ShadyCSS || t$2.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, s$2 = Symbol(), o$4 = /* @__PURE__ */ new WeakMap();
let n$3 = class n {
  constructor(t2, e2, o2) {
    if (this._$cssResult$ = true, o2 !== s$2) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t2, this.t = e2;
  }
  get styleSheet() {
    let t2 = this.o;
    const s2 = this.t;
    if (e$4 && void 0 === t2) {
      const e2 = void 0 !== s2 && 1 === s2.length;
      e2 && (t2 = o$4.get(s2)), void 0 === t2 && ((this.o = t2 = new CSSStyleSheet()).replaceSync(this.cssText), e2 && o$4.set(s2, t2));
    }
    return t2;
  }
  toString() {
    return this.cssText;
  }
};
const r$4 = (t2) => new n$3("string" == typeof t2 ? t2 : t2 + "", void 0, s$2), i$3 = (t2, ...e2) => {
  const o2 = 1 === t2.length ? t2[0] : e2.reduce((e3, s2, o3) => e3 + ((t3) => {
    if (true === t3._$cssResult$) return t3.cssText;
    if ("number" == typeof t3) return t3;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t3 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s2) + t2[o3 + 1], t2[0]);
  return new n$3(o2, t2, s$2);
}, S$1 = (s2, o2) => {
  if (e$4) s2.adoptedStyleSheets = o2.map((t2) => t2 instanceof CSSStyleSheet ? t2 : t2.styleSheet);
  else for (const e2 of o2) {
    const o3 = document.createElement("style"), n3 = t$2.litNonce;
    void 0 !== n3 && o3.setAttribute("nonce", n3), o3.textContent = e2.cssText, s2.appendChild(o3);
  }
}, c$2 = e$4 ? (t2) => t2 : (t2) => t2 instanceof CSSStyleSheet ? ((t3) => {
  let e2 = "";
  for (const s2 of t3.cssRules) e2 += s2.cssText;
  return r$4(e2);
})(t2) : t2;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: i$2, defineProperty: e$3, getOwnPropertyDescriptor: h$1, getOwnPropertyNames: r$3, getOwnPropertySymbols: o$3, getPrototypeOf: n$2 } = Object, a$1 = globalThis, c$1 = a$1.trustedTypes, l$1 = c$1 ? c$1.emptyScript : "", p$1 = a$1.reactiveElementPolyfillSupport, d$1 = (t2, s2) => t2, u$1 = { toAttribute(t2, s2) {
  switch (s2) {
    case Boolean:
      t2 = t2 ? l$1 : null;
      break;
    case Object:
    case Array:
      t2 = null == t2 ? t2 : JSON.stringify(t2);
  }
  return t2;
}, fromAttribute(t2, s2) {
  let i2 = t2;
  switch (s2) {
    case Boolean:
      i2 = null !== t2;
      break;
    case Number:
      i2 = null === t2 ? null : Number(t2);
      break;
    case Object:
    case Array:
      try {
        i2 = JSON.parse(t2);
      } catch (t3) {
        i2 = null;
      }
  }
  return i2;
} }, f$1 = (t2, s2) => !i$2(t2, s2), b$1 = { attribute: true, type: String, converter: u$1, reflect: false, useDefault: false, hasChanged: f$1 };
Symbol.metadata ??= Symbol("metadata"), a$1.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let y$1 = class y extends HTMLElement {
  static addInitializer(t2) {
    this._$Ei(), (this.l ??= []).push(t2);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t2, s2 = b$1) {
    if (s2.state && (s2.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t2) && ((s2 = Object.create(s2)).wrapped = true), this.elementProperties.set(t2, s2), !s2.noAccessor) {
      const i2 = Symbol(), h2 = this.getPropertyDescriptor(t2, i2, s2);
      void 0 !== h2 && e$3(this.prototype, t2, h2);
    }
  }
  static getPropertyDescriptor(t2, s2, i2) {
    const { get: e2, set: r2 } = h$1(this.prototype, t2) ?? { get() {
      return this[s2];
    }, set(t3) {
      this[s2] = t3;
    } };
    return { get: e2, set(s3) {
      const h2 = e2?.call(this);
      r2?.call(this, s3), this.requestUpdate(t2, h2, i2);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t2) {
    return this.elementProperties.get(t2) ?? b$1;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d$1("elementProperties"))) return;
    const t2 = n$2(this);
    t2.finalize(), void 0 !== t2.l && (this.l = [...t2.l]), this.elementProperties = new Map(t2.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d$1("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d$1("properties"))) {
      const t3 = this.properties, s2 = [...r$3(t3), ...o$3(t3)];
      for (const i2 of s2) this.createProperty(i2, t3[i2]);
    }
    const t2 = this[Symbol.metadata];
    if (null !== t2) {
      const s2 = litPropertyMetadata.get(t2);
      if (void 0 !== s2) for (const [t3, i2] of s2) this.elementProperties.set(t3, i2);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t3, s2] of this.elementProperties) {
      const i2 = this._$Eu(t3, s2);
      void 0 !== i2 && this._$Eh.set(i2, t3);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s2) {
    const i2 = [];
    if (Array.isArray(s2)) {
      const e2 = new Set(s2.flat(1 / 0).reverse());
      for (const s3 of e2) i2.unshift(c$2(s3));
    } else void 0 !== s2 && i2.push(c$2(s2));
    return i2;
  }
  static _$Eu(t2, s2) {
    const i2 = s2.attribute;
    return false === i2 ? void 0 : "string" == typeof i2 ? i2 : "string" == typeof t2 ? t2.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t2) => this.enableUpdating = t2), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t2) => t2(this));
  }
  addController(t2) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t2), void 0 !== this.renderRoot && this.isConnected && t2.hostConnected?.();
  }
  removeController(t2) {
    this._$EO?.delete(t2);
  }
  _$E_() {
    const t2 = /* @__PURE__ */ new Map(), s2 = this.constructor.elementProperties;
    for (const i2 of s2.keys()) this.hasOwnProperty(i2) && (t2.set(i2, this[i2]), delete this[i2]);
    t2.size > 0 && (this._$Ep = t2);
  }
  createRenderRoot() {
    const t2 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S$1(t2, this.constructor.elementStyles), t2;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t2) => t2.hostConnected?.());
  }
  enableUpdating(t2) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t2) => t2.hostDisconnected?.());
  }
  attributeChangedCallback(t2, s2, i2) {
    this._$AK(t2, i2);
  }
  _$ET(t2, s2) {
    const i2 = this.constructor.elementProperties.get(t2), e2 = this.constructor._$Eu(t2, i2);
    if (void 0 !== e2 && true === i2.reflect) {
      const h2 = (void 0 !== i2.converter?.toAttribute ? i2.converter : u$1).toAttribute(s2, i2.type);
      this._$Em = t2, null == h2 ? this.removeAttribute(e2) : this.setAttribute(e2, h2), this._$Em = null;
    }
  }
  _$AK(t2, s2) {
    const i2 = this.constructor, e2 = i2._$Eh.get(t2);
    if (void 0 !== e2 && this._$Em !== e2) {
      const t3 = i2.getPropertyOptions(e2), h2 = "function" == typeof t3.converter ? { fromAttribute: t3.converter } : void 0 !== t3.converter?.fromAttribute ? t3.converter : u$1;
      this._$Em = e2;
      const r2 = h2.fromAttribute(s2, t3.type);
      this[e2] = r2 ?? this._$Ej?.get(e2) ?? r2, this._$Em = null;
    }
  }
  requestUpdate(t2, s2, i2, e2 = false, h2) {
    if (void 0 !== t2) {
      const r2 = this.constructor;
      if (false === e2 && (h2 = this[t2]), i2 ??= r2.getPropertyOptions(t2), !((i2.hasChanged ?? f$1)(h2, s2) || i2.useDefault && i2.reflect && h2 === this._$Ej?.get(t2) && !this.hasAttribute(r2._$Eu(t2, i2)))) return;
      this.C(t2, s2, i2);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t2, s2, { useDefault: i2, reflect: e2, wrapped: h2 }, r2) {
    i2 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t2) && (this._$Ej.set(t2, r2 ?? s2 ?? this[t2]), true !== h2 || void 0 !== r2) || (this._$AL.has(t2) || (this.hasUpdated || i2 || (s2 = void 0), this._$AL.set(t2, s2)), true === e2 && this._$Em !== t2 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t2));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t3) {
      Promise.reject(t3);
    }
    const t2 = this.scheduleUpdate();
    return null != t2 && await t2, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t4, s3] of this._$Ep) this[t4] = s3;
        this._$Ep = void 0;
      }
      const t3 = this.constructor.elementProperties;
      if (t3.size > 0) for (const [s3, i2] of t3) {
        const { wrapped: t4 } = i2, e2 = this[s3];
        true !== t4 || this._$AL.has(s3) || void 0 === e2 || this.C(s3, void 0, i2, e2);
      }
    }
    let t2 = false;
    const s2 = this._$AL;
    try {
      t2 = this.shouldUpdate(s2), t2 ? (this.willUpdate(s2), this._$EO?.forEach((t3) => t3.hostUpdate?.()), this.update(s2)) : this._$EM();
    } catch (s3) {
      throw t2 = false, this._$EM(), s3;
    }
    t2 && this._$AE(s2);
  }
  willUpdate(t2) {
  }
  _$AE(t2) {
    this._$EO?.forEach((t3) => t3.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t2)), this.updated(t2);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t2) {
    return true;
  }
  update(t2) {
    this._$Eq &&= this._$Eq.forEach((t3) => this._$ET(t3, this[t3])), this._$EM();
  }
  updated(t2) {
  }
  firstUpdated(t2) {
  }
};
y$1.elementStyles = [], y$1.shadowRootOptions = { mode: "open" }, y$1[d$1("elementProperties")] = /* @__PURE__ */ new Map(), y$1[d$1("finalized")] = /* @__PURE__ */ new Map(), p$1?.({ ReactiveElement: y$1 }), (a$1.reactiveElementVersions ??= []).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$1 = globalThis, i$1 = (t2) => t2, s$1 = t$1.trustedTypes, e$2 = s$1 ? s$1.createPolicy("lit-html", { createHTML: (t2) => t2 }) : void 0, h = "$lit$", o$2 = `lit$${Math.random().toFixed(9).slice(2)}$`, n$1 = "?" + o$2, r$2 = `<${n$1}>`, l = document, c = () => l.createComment(""), a = (t2) => null === t2 || "object" != typeof t2 && "function" != typeof t2, u = Array.isArray, d = (t2) => u(t2) || "function" == typeof t2?.[Symbol.iterator], f = "[ 	\n\f\r]", v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, _ = /-->/g, m = />/g, p = RegExp(`>|${f}(?:([^\\s"'>=/]+)(${f}*=${f}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), g = /'/g, $ = /"/g, y2 = /^(?:script|style|textarea|title)$/i, x = (t2) => (i2, ...s2) => ({ _$litType$: t2, strings: i2, values: s2 }), b = x(1), E = Symbol.for("lit-noChange"), A = Symbol.for("lit-nothing"), C = /* @__PURE__ */ new WeakMap(), P = l.createTreeWalker(l, 129);
function V(t2, i2) {
  if (!u(t2) || !t2.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e$2 ? e$2.createHTML(i2) : i2;
}
const N = (t2, i2) => {
  const s2 = t2.length - 1, e2 = [];
  let n3, l2 = 2 === i2 ? "<svg>" : 3 === i2 ? "<math>" : "", c2 = v;
  for (let i3 = 0; i3 < s2; i3++) {
    const s3 = t2[i3];
    let a2, u2, d2 = -1, f2 = 0;
    for (; f2 < s3.length && (c2.lastIndex = f2, u2 = c2.exec(s3), null !== u2); ) f2 = c2.lastIndex, c2 === v ? "!--" === u2[1] ? c2 = _ : void 0 !== u2[1] ? c2 = m : void 0 !== u2[2] ? (y2.test(u2[2]) && (n3 = RegExp("</" + u2[2], "g")), c2 = p) : void 0 !== u2[3] && (c2 = p) : c2 === p ? ">" === u2[0] ? (c2 = n3 ?? v, d2 = -1) : void 0 === u2[1] ? d2 = -2 : (d2 = c2.lastIndex - u2[2].length, a2 = u2[1], c2 = void 0 === u2[3] ? p : '"' === u2[3] ? $ : g) : c2 === $ || c2 === g ? c2 = p : c2 === _ || c2 === m ? c2 = v : (c2 = p, n3 = void 0);
    const x2 = c2 === p && t2[i3 + 1].startsWith("/>") ? " " : "";
    l2 += c2 === v ? s3 + r$2 : d2 >= 0 ? (e2.push(a2), s3.slice(0, d2) + h + s3.slice(d2) + o$2 + x2) : s3 + o$2 + (-2 === d2 ? i3 : x2);
  }
  return [V(t2, l2 + (t2[s2] || "<?>") + (2 === i2 ? "</svg>" : 3 === i2 ? "</math>" : "")), e2];
};
class S {
  constructor({ strings: t2, _$litType$: i2 }, e2) {
    let r2;
    this.parts = [];
    let l2 = 0, a2 = 0;
    const u2 = t2.length - 1, d2 = this.parts, [f2, v2] = N(t2, i2);
    if (this.el = S.createElement(f2, e2), P.currentNode = this.el.content, 2 === i2 || 3 === i2) {
      const t3 = this.el.content.firstChild;
      t3.replaceWith(...t3.childNodes);
    }
    for (; null !== (r2 = P.nextNode()) && d2.length < u2; ) {
      if (1 === r2.nodeType) {
        if (r2.hasAttributes()) for (const t3 of r2.getAttributeNames()) if (t3.endsWith(h)) {
          const i3 = v2[a2++], s2 = r2.getAttribute(t3).split(o$2), e3 = /([.?@])?(.*)/.exec(i3);
          d2.push({ type: 1, index: l2, name: e3[2], strings: s2, ctor: "." === e3[1] ? I : "?" === e3[1] ? L : "@" === e3[1] ? z : H }), r2.removeAttribute(t3);
        } else t3.startsWith(o$2) && (d2.push({ type: 6, index: l2 }), r2.removeAttribute(t3));
        if (y2.test(r2.tagName)) {
          const t3 = r2.textContent.split(o$2), i3 = t3.length - 1;
          if (i3 > 0) {
            r2.textContent = s$1 ? s$1.emptyScript : "";
            for (let s2 = 0; s2 < i3; s2++) r2.append(t3[s2], c()), P.nextNode(), d2.push({ type: 2, index: ++l2 });
            r2.append(t3[i3], c());
          }
        }
      } else if (8 === r2.nodeType) if (r2.data === n$1) d2.push({ type: 2, index: l2 });
      else {
        let t3 = -1;
        for (; -1 !== (t3 = r2.data.indexOf(o$2, t3 + 1)); ) d2.push({ type: 7, index: l2 }), t3 += o$2.length - 1;
      }
      l2++;
    }
  }
  static createElement(t2, i2) {
    const s2 = l.createElement("template");
    return s2.innerHTML = t2, s2;
  }
}
function M(t2, i2, s2 = t2, e2) {
  if (i2 === E) return i2;
  let h2 = void 0 !== e2 ? s2._$Co?.[e2] : s2._$Cl;
  const o2 = a(i2) ? void 0 : i2._$litDirective$;
  return h2?.constructor !== o2 && (h2?._$AO?.(false), void 0 === o2 ? h2 = void 0 : (h2 = new o2(t2), h2._$AT(t2, s2, e2)), void 0 !== e2 ? (s2._$Co ??= [])[e2] = h2 : s2._$Cl = h2), void 0 !== h2 && (i2 = M(t2, h2._$AS(t2, i2.values), h2, e2)), i2;
}
class R {
  constructor(t2, i2) {
    this._$AV = [], this._$AN = void 0, this._$AD = t2, this._$AM = i2;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t2) {
    const { el: { content: i2 }, parts: s2 } = this._$AD, e2 = (t2?.creationScope ?? l).importNode(i2, true);
    P.currentNode = e2;
    let h2 = P.nextNode(), o2 = 0, n3 = 0, r2 = s2[0];
    for (; void 0 !== r2; ) {
      if (o2 === r2.index) {
        let i3;
        2 === r2.type ? i3 = new k(h2, h2.nextSibling, this, t2) : 1 === r2.type ? i3 = new r2.ctor(h2, r2.name, r2.strings, this, t2) : 6 === r2.type && (i3 = new Z(h2, this, t2)), this._$AV.push(i3), r2 = s2[++n3];
      }
      o2 !== r2?.index && (h2 = P.nextNode(), o2++);
    }
    return P.currentNode = l, e2;
  }
  p(t2) {
    let i2 = 0;
    for (const s2 of this._$AV) void 0 !== s2 && (void 0 !== s2.strings ? (s2._$AI(t2, s2, i2), i2 += s2.strings.length - 2) : s2._$AI(t2[i2])), i2++;
  }
}
class k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t2, i2, s2, e2) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t2, this._$AB = i2, this._$AM = s2, this.options = e2, this._$Cv = e2?.isConnected ?? true;
  }
  get parentNode() {
    let t2 = this._$AA.parentNode;
    const i2 = this._$AM;
    return void 0 !== i2 && 11 === t2?.nodeType && (t2 = i2.parentNode), t2;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t2, i2 = this) {
    t2 = M(this, t2, i2), a(t2) ? t2 === A || null == t2 || "" === t2 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t2 !== this._$AH && t2 !== E && this._(t2) : void 0 !== t2._$litType$ ? this.$(t2) : void 0 !== t2.nodeType ? this.T(t2) : d(t2) ? this.k(t2) : this._(t2);
  }
  O(t2) {
    return this._$AA.parentNode.insertBefore(t2, this._$AB);
  }
  T(t2) {
    this._$AH !== t2 && (this._$AR(), this._$AH = this.O(t2));
  }
  _(t2) {
    this._$AH !== A && a(this._$AH) ? this._$AA.nextSibling.data = t2 : this.T(l.createTextNode(t2)), this._$AH = t2;
  }
  $(t2) {
    const { values: i2, _$litType$: s2 } = t2, e2 = "number" == typeof s2 ? this._$AC(t2) : (void 0 === s2.el && (s2.el = S.createElement(V(s2.h, s2.h[0]), this.options)), s2);
    if (this._$AH?._$AD === e2) this._$AH.p(i2);
    else {
      const t3 = new R(e2, this), s3 = t3.u(this.options);
      t3.p(i2), this.T(s3), this._$AH = t3;
    }
  }
  _$AC(t2) {
    let i2 = C.get(t2.strings);
    return void 0 === i2 && C.set(t2.strings, i2 = new S(t2)), i2;
  }
  k(t2) {
    u(this._$AH) || (this._$AH = [], this._$AR());
    const i2 = this._$AH;
    let s2, e2 = 0;
    for (const h2 of t2) e2 === i2.length ? i2.push(s2 = new k(this.O(c()), this.O(c()), this, this.options)) : s2 = i2[e2], s2._$AI(h2), e2++;
    e2 < i2.length && (this._$AR(s2 && s2._$AB.nextSibling, e2), i2.length = e2);
  }
  _$AR(t2 = this._$AA.nextSibling, s2) {
    for (this._$AP?.(false, true, s2); t2 !== this._$AB; ) {
      const s3 = i$1(t2).nextSibling;
      i$1(t2).remove(), t2 = s3;
    }
  }
  setConnected(t2) {
    void 0 === this._$AM && (this._$Cv = t2, this._$AP?.(t2));
  }
}
class H {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t2, i2, s2, e2, h2) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t2, this.name = i2, this._$AM = e2, this.options = h2, s2.length > 2 || "" !== s2[0] || "" !== s2[1] ? (this._$AH = Array(s2.length - 1).fill(new String()), this.strings = s2) : this._$AH = A;
  }
  _$AI(t2, i2 = this, s2, e2) {
    const h2 = this.strings;
    let o2 = false;
    if (void 0 === h2) t2 = M(this, t2, i2, 0), o2 = !a(t2) || t2 !== this._$AH && t2 !== E, o2 && (this._$AH = t2);
    else {
      const e3 = t2;
      let n3, r2;
      for (t2 = h2[0], n3 = 0; n3 < h2.length - 1; n3++) r2 = M(this, e3[s2 + n3], i2, n3), r2 === E && (r2 = this._$AH[n3]), o2 ||= !a(r2) || r2 !== this._$AH[n3], r2 === A ? t2 = A : t2 !== A && (t2 += (r2 ?? "") + h2[n3 + 1]), this._$AH[n3] = r2;
    }
    o2 && !e2 && this.j(t2);
  }
  j(t2) {
    t2 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t2 ?? "");
  }
}
class I extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t2) {
    this.element[this.name] = t2 === A ? void 0 : t2;
  }
}
class L extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t2) {
    this.element.toggleAttribute(this.name, !!t2 && t2 !== A);
  }
}
class z extends H {
  constructor(t2, i2, s2, e2, h2) {
    super(t2, i2, s2, e2, h2), this.type = 5;
  }
  _$AI(t2, i2 = this) {
    if ((t2 = M(this, t2, i2, 0) ?? A) === E) return;
    const s2 = this._$AH, e2 = t2 === A && s2 !== A || t2.capture !== s2.capture || t2.once !== s2.once || t2.passive !== s2.passive, h2 = t2 !== A && (s2 === A || e2);
    e2 && this.element.removeEventListener(this.name, this, s2), h2 && this.element.addEventListener(this.name, this, t2), this._$AH = t2;
  }
  handleEvent(t2) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t2) : this._$AH.handleEvent(t2);
  }
}
class Z {
  constructor(t2, i2, s2) {
    this.element = t2, this.type = 6, this._$AN = void 0, this._$AM = i2, this.options = s2;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t2) {
    M(this, t2);
  }
}
const B = t$1.litHtmlPolyfillSupport;
B?.(S, k), (t$1.litHtmlVersions ??= []).push("3.3.2");
const D = (t2, i2, s2) => {
  const e2 = s2?.renderBefore ?? i2;
  let h2 = e2._$litPart$;
  if (void 0 === h2) {
    const t3 = s2?.renderBefore ?? null;
    e2._$litPart$ = h2 = new k(i2.insertBefore(c(), t3), t3, void 0, s2 ?? {});
  }
  return h2._$AI(t2), h2;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const s = globalThis;
class i extends y$1 {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t2 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t2.firstChild, t2;
  }
  update(t2) {
    const r2 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t2), this._$Do = D(r2, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
}
i._$litElement$ = true, i["finalized"] = true, s.litElementHydrateSupport?.({ LitElement: i });
const o$1 = s.litElementPolyfillSupport;
o$1?.({ LitElement: i });
(s.litElementVersions ??= []).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t = (t2) => (e2, o2) => {
  void 0 !== o2 ? o2.addInitializer(() => {
    customElements.define(t2, e2);
  }) : customElements.define(t2, e2);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const o = { attribute: true, type: String, converter: u$1, reflect: false, hasChanged: f$1 }, r$1 = (t2 = o, e2, r2) => {
  const { kind: n3, metadata: i2 } = r2;
  let s2 = globalThis.litPropertyMetadata.get(i2);
  if (void 0 === s2 && globalThis.litPropertyMetadata.set(i2, s2 = /* @__PURE__ */ new Map()), "setter" === n3 && ((t2 = Object.create(t2)).wrapped = true), s2.set(r2.name, t2), "accessor" === n3) {
    const { name: o2 } = r2;
    return { set(r3) {
      const n4 = e2.get.call(this);
      e2.set.call(this, r3), this.requestUpdate(o2, n4, t2, true, r3);
    }, init(e3) {
      return void 0 !== e3 && this.C(o2, void 0, t2, e3), e3;
    } };
  }
  if ("setter" === n3) {
    const { name: o2 } = r2;
    return function(r3) {
      const n4 = this[o2];
      e2.call(this, r3), this.requestUpdate(o2, n4, t2, true, r3);
    };
  }
  throw Error("Unsupported decorator location: " + n3);
};
function n2(t2) {
  return (e2, o2) => "object" == typeof o2 ? r$1(t2, e2, o2) : ((t3, e3, o3) => {
    const r2 = e3.hasOwnProperty(o3);
    return e3.constructor.createProperty(o3, t3), r2 ? Object.getOwnPropertyDescriptor(e3, o3) : void 0;
  })(t2, e2, o2);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function r(r2) {
  return n2({ ...r2, state: true, attribute: false });
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e$1 = (e2, t2, c2) => (c2.configurable = true, c2.enumerable = true, Reflect.decorate && "object" != typeof t2 && Object.defineProperty(e2, t2, c2), c2);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function e(e2, r2) {
  return (n3, s2, i2) => {
    const o2 = (t2) => t2.renderRoot?.querySelector(e2) ?? null;
    return e$1(n3, s2, { get() {
      return o2(this);
    } });
  };
}
var __defProp$h = Object.defineProperty;
var __getOwnPropDesc$h = Object.getOwnPropertyDescriptor;
var __decorateClass$h = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$h(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$h(target, key, result);
  return result;
};
function parseISO$3(iso) {
  return new Date(iso);
}
function dateKey$3(d2) {
  const y3 = d2.getFullYear();
  const m2 = String(d2.getMonth() + 1).padStart(2, "0");
  const day = String(d2.getDate()).padStart(2, "0");
  return `${y3}-${m2}-${day}`;
}
function sameDay$1(a2, b2) {
  return a2.getFullYear() === b2.getFullYear() && a2.getMonth() === b2.getMonth() && a2.getDate() === b2.getDate();
}
function fmtTime$2(d2) {
  const h2 = d2.getHours();
  const m2 = d2.getMinutes();
  const ampm = h2 >= 12 ? "PM" : "AM";
  const h12 = h2 % 12 || 12;
  return m2 === 0 ? `${h12} ${ampm}` : `${h12}:${String(m2).padStart(2, "0")} ${ampm}`;
}
function buildMonthGrid$1(year, month, weekStartsMonday) {
  const first = new Date(year, month, 1);
  let startDow = first.getDay();
  if (weekStartsMonday) {
    startDow = (startDow + 6) % 7;
  }
  const days = [];
  for (let i2 = startDow - 1; i2 >= 0; i2--) {
    const d2 = new Date(year, month, -i2);
    days.push({ date: d2, key: dateKey$3(d2), inMonth: false });
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i2 = 1; i2 <= daysInMonth; i2++) {
    const d2 = new Date(year, month, i2);
    days.push({ date: d2, key: dateKey$3(d2), inMonth: true });
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    const d2 = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    days.push({ date: d2, key: dateKey$3(d2), inMonth: false });
  }
  return days;
}
const MAX_VISIBLE_EVENTS = 3;
let CaleeMonthView = class extends i {
  constructor() {
    super(...arguments);
    this.events = [];
    this.calendars = /* @__PURE__ */ new Map();
    this.enabledCalendarIds = /* @__PURE__ */ new Set();
    this.selectedDate = /* @__PURE__ */ new Date();
    this.templates = [];
    this.tasks = [];
    this.conflicts = [];
    this.weekStartsMonday = true;
    this.narrow = false;
    this._grid = [];
    this._eventsByDay = /* @__PURE__ */ new Map();
    this._taskCountByDay = /* @__PURE__ */ new Map();
    this._conflictDays = /* @__PURE__ */ new Set();
    this._today = dateKey$3(/* @__PURE__ */ new Date());
  }
  // ── Lifecycle ────────────────────────────────────────────────────────
  willUpdate(changed) {
    if (changed.has("selectedDate") || changed.has("weekStartsMonday")) {
      this._grid = buildMonthGrid$1(
        this.selectedDate.getFullYear(),
        this.selectedDate.getMonth(),
        this.weekStartsMonday
      );
    }
    if (changed.has("events") || changed.has("enabledCalendarIds") || changed.has("selectedDate") || changed.has("weekStartsMonday")) {
      this._buildEventMap();
    }
    if (changed.has("tasks")) {
      this._buildTaskCountMap();
    }
    if (changed.has("conflicts")) {
      this._buildConflictDays();
    }
  }
  _buildEventMap() {
    const map = /* @__PURE__ */ new Map();
    const visible = this.events.filter(
      (e2) => !e2.deleted_at && this.enabledCalendarIds.has(e2.calendar_id)
    );
    for (const ev of visible) {
      const start = parseISO$3(ev.start);
      const end = parseISO$3(ev.end);
      if (ev.all_day) {
        const cursor = new Date(start);
        const endDay = new Date(end.getTime() - 1);
        while (cursor <= endDay) {
          const key = dateKey$3(cursor);
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(ev);
          cursor.setDate(cursor.getDate() + 1);
        }
      } else {
        const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        while (cursor <= endDay) {
          const key = dateKey$3(cursor);
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(ev);
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }
    this._eventsByDay = map;
  }
  /** Precompute task counts per day to avoid O(days x tasks) in render. */
  _buildTaskCountMap() {
    const map = /* @__PURE__ */ new Map();
    for (const t2 of this.tasks) {
      if (t2.due && !t2.completed && !t2.deleted_at) {
        const key = t2.due.slice(0, 10);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    this._taskCountByDay = map;
  }
  /** Precompute which days have conflicts, handling multi-day event spans. */
  _buildConflictDays() {
    const days = /* @__PURE__ */ new Set();
    for (const c2 of this.conflicts) {
      for (const ev of [c2.eventA, c2.eventB]) {
        const start = parseISO$3(ev.start);
        const end = parseISO$3(ev.end);
        const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        while (cursor <= endDay) {
          days.add(dateKey$3(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }
    this._conflictDays = days;
  }
  // ── Event handlers ───────────────────────────────────────────────────
  _onEventClick(ev, eventId) {
    ev.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("event-click", { detail: { eventId }, bubbles: true, composed: true })
    );
  }
  _onCellClick(dayKey) {
    this.dispatchEvent(
      new CustomEvent("cell-click", { detail: { date: dayKey }, bubbles: true, composed: true })
    );
  }
  _onMoreClick(ev, dayKey) {
    ev.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("cell-click", { detail: { date: dayKey }, bubbles: true, composed: true })
    );
  }
  // ── Render ───────────────────────────────────────────────────────────
  _renderDayNames() {
    if (this.narrow) {
      const letters = this.weekStartsMonday ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"];
      return letters.map((n3) => b`<div class="day-name">${n3}</div>`);
    }
    const names = this.weekStartsMonday ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return names.map((n3) => b`<div class="day-name">${n3}</div>`);
  }
  _renderEventChip(ev) {
    const cal = this.calendars.get(ev.calendar_id);
    const color = cal?.color ?? "var(--primary-color)";
    const start = parseISO$3(ev.start);
    const timeStr = ev.all_day ? "" : fmtTime$2(start);
    const tplEmoji = ev.template_id ? this.templates.find((t2) => t2.id === ev.template_id)?.emoji ?? "" : "";
    if (this.narrow) {
      return b`
        <div
          class="event-dot"
          style="background: ${color}"
          title="${ev.title}"
          @click=${(e2) => this._onEventClick(e2, ev.id)}
        ></div>
      `;
    }
    const isRecurring = !!ev.recurrence_rule;
    return b`
      <div
        class="event-chip"
        style="--chip-color: ${color}"
        title="${ev.title}"
        @click=${(e2) => this._onEventClick(e2, ev.id)}
      >
        ${tplEmoji ? b`<span class="chip-emoji">${tplEmoji}</span>` : A}
        ${isRecurring ? b`<span class="chip-recur" title="Recurring">&#x1F501;</span>` : A}
        ${timeStr ? b`<span class="chip-time">${timeStr}</span>` : A}
        <span class="chip-title">${ev.title}</span>
      </div>
    `;
  }
  _renderCell(day) {
    const isToday2 = day.key === this._today;
    const isSelected = sameDay$1(day.date, this.selectedDate);
    const dayEvents = this._eventsByDay.get(day.key) ?? [];
    const overflow = dayEvents.length - MAX_VISIBLE_EVENTS;
    const taskCount = this._taskCountByDay.get(day.key) ?? 0;
    const dayHasConflict = this._conflictDays.has(day.key);
    const classes = ["cell"];
    if (!day.inMonth) classes.push("outside");
    if (isToday2) classes.push("today");
    if (isSelected) classes.push("selected");
    return b`
      <div class=${classes.join(" ")} @click=${() => this._onCellClick(day.key)}>
        <div style="display:flex;align-items:center;gap:4px;">
          <span class="date-number">${day.date.getDate()}</span>
          ${dayHasConflict ? b`<span class="conflict-badge" title="Schedule conflict">!</span>` : A}
        </div>
        <div class="events">
          ${dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((e2) => this._renderEventChip(e2))}
          ${overflow > 0 ? b`<button
                class="more-link"
                @click=${(e2) => this._onMoreClick(e2, day.key)}
              >+${overflow} more</button>` : A}
        </div>
        ${taskCount > 0 ? b`<div class="task-badge">${taskCount} task${taskCount > 1 ? "s" : ""}</div>` : A}
      </div>
    `;
  }
  render() {
    return b`
      <div class="month-grid">
        <div class="header-row">${this._renderDayNames()}</div>
        <div class="body">${this._grid.map((d2) => this._renderCell(d2))}</div>
      </div>
    `;
  }
};
CaleeMonthView.styles = i$3`
    :host {
      display: block;
      --cell-min-height: 80px;
    }

    .month-grid {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    /* ── Header row ────────────────────────────────────────────────── */

    .header-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      width: 100%;
    }

    .day-name {
      text-align: center;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 8px 0;
      color: var(--secondary-text-color, #666);
    }

    /* ── Grid body ─────────────────────────────────────────────────── */

    .body {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      flex: 1;
      overflow-y: auto;
      width: 100%;
    }

    /* ── Day cell ──────────────────────────────────────────────────── */

    .cell {
      min-height: var(--cell-min-height);
      border-right: 1px solid var(--divider-color, #e0e0e0);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      padding: 4px;
      cursor: pointer;
      transition: background-color 0.15s ease;
      display: flex;
      flex-direction: column;
    }

    .cell:nth-child(7n) {
      border-right: none;
    }

    .cell:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .cell.outside {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
    }

    .cell.outside .date-number {
      color: var(--disabled-text-color, #aaa);
    }

    .cell.today {
      background: color-mix(
        in srgb,
        var(--primary-color, #03a9f4) 8%,
        transparent
      );
    }

    .cell.today .date-number {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    .cell.selected {
      box-shadow: inset 0 0 0 2px var(--primary-color, #03a9f4);
    }

    /* ── Date number ───────────────────────────────────────────────── */

    .date-number {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      margin-bottom: 2px;
      line-height: 26px;
    }

    /* ── Events in cell ────────────────────────────────────────────── */

    .events {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .event-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      background: color-mix(in srgb, var(--chip-color) 12%, transparent);
      color: var(--primary-text-color, #212121);
      border-left: 3px solid var(--chip-color);
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 0.7rem;
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .event-chip:hover {
      background: color-mix(in srgb, var(--chip-color) 20%, transparent);
    }

    .chip-emoji {
      flex-shrink: 0;
      font-size: 0.7rem;
      line-height: 1;
    }

    .chip-recur {
      flex-shrink: 0;
      font-size: 0.55rem;
      line-height: 1;
      opacity: 0.6;
    }

    .chip-time {
      flex-shrink: 0;
      opacity: 0.7;
      font-size: 0.65rem;
      color: var(--secondary-text-color, #666);
    }

    .chip-title {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .more-link {
      all: unset;
      font-size: 0.7rem;
      color: var(--primary-color, #03a9f4);
      cursor: pointer;
      padding: 1px 4px;
      border-radius: 4px;
    }

    .more-link:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.08));
    }

    .task-badge {
      font-size: 0.6rem;
      color: var(--secondary-text-color, #999);
      padding: 1px 4px;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conflict-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--warning-color, #ff9800);
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      flex-shrink: 0;
      line-height: 1;
    }

    /* ── Event dot (narrow/mobile mode) ────────────────────────────── */

    .event-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
      cursor: pointer;
    }

    :host([narrow]) .events {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 3px;
    }

    /* ── Responsive ────────────────────────────────────────────────── */

    :host([narrow]) {
      --cell-min-height: 52px;
    }

    :host([narrow]) .day-name {
      font-size: 0.6rem;
      padding: 4px 0;
    }

    :host([narrow]) .cell {
      padding: 2px;
    }

    :host([narrow]) .date-number {
      font-size: 0.7rem;
      line-height: 20px;
    }

    :host([narrow]) .cell.today .date-number {
      width: 20px;
      height: 20px;
      font-size: 0.65rem;
    }

    :host([narrow]) .more-link {
      font-size: 0.6rem;
      padding: 0 2px;
    }

    @media (max-width: 600px) {
      :host {
        --cell-min-height: 52px;
      }

      .day-name {
        font-size: 0.6rem;
        padding: 4px 0;
      }

      .cell {
        padding: 2px;
      }

      .date-number {
        font-size: 0.7rem;
      }

      .event-chip {
        font-size: 0.6rem;
        padding: 1px 4px;
      }

      .chip-time {
        display: none;
      }
    }
  `;
__decorateClass$h([
  n2({ attribute: false })
], CaleeMonthView.prototype, "events", 2);
__decorateClass$h([
  n2({ attribute: false })
], CaleeMonthView.prototype, "calendars", 2);
__decorateClass$h([
  n2({ attribute: false })
], CaleeMonthView.prototype, "enabledCalendarIds", 2);
__decorateClass$h([
  n2({ attribute: false })
], CaleeMonthView.prototype, "selectedDate", 2);
__decorateClass$h([
  n2({ attribute: false })
], CaleeMonthView.prototype, "templates", 2);
__decorateClass$h([
  n2({ attribute: false })
], CaleeMonthView.prototype, "tasks", 2);
__decorateClass$h([
  n2({ attribute: false })
], CaleeMonthView.prototype, "conflicts", 2);
__decorateClass$h([
  n2({ type: Boolean })
], CaleeMonthView.prototype, "weekStartsMonday", 2);
__decorateClass$h([
  n2({ type: Boolean, reflect: true })
], CaleeMonthView.prototype, "narrow", 2);
__decorateClass$h([
  r()
], CaleeMonthView.prototype, "_grid", 2);
__decorateClass$h([
  r()
], CaleeMonthView.prototype, "_eventsByDay", 2);
__decorateClass$h([
  r()
], CaleeMonthView.prototype, "_taskCountByDay", 2);
__decorateClass$h([
  r()
], CaleeMonthView.prototype, "_conflictDays", 2);
CaleeMonthView = __decorateClass$h([
  t("calee-month-view")
], CaleeMonthView);
var __defProp$g = Object.defineProperty;
var __getOwnPropDesc$g = Object.getOwnPropertyDescriptor;
var __decorateClass$g = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$g(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$g(target, key, result);
  return result;
};
function parseISO$2(iso) {
  return new Date(iso);
}
function dateKey$2(d2) {
  const y3 = d2.getFullYear();
  const m2 = String(d2.getMonth() + 1).padStart(2, "0");
  const day = String(d2.getDate()).padStart(2, "0");
  return `${y3}-${m2}-${day}`;
}
function sameDay(a2, b2) {
  return a2.getFullYear() === b2.getFullYear() && a2.getMonth() === b2.getMonth() && a2.getDate() === b2.getDate();
}
function fmtTime$1(d2) {
  const h2 = d2.getHours();
  const m2 = d2.getMinutes();
  const ampm = h2 >= 12 ? "PM" : "AM";
  const h12 = h2 % 12 || 12;
  return m2 === 0 ? `${h12} ${ampm}` : `${h12}:${String(m2).padStart(2, "0")} ${ampm}`;
}
function fmtHour$1(hour) {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}
function fmtDayHeader(d2) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d2.getDay()]} ${d2.getDate()}`;
}
function startOfDay$1(d2) {
  return new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
}
function minutesInDay$1(d2) {
  return d2.getHours() * 60 + d2.getMinutes();
}
function getWeekDays(selectedDate, weekStartsMonday, maxDays = 7) {
  const d2 = new Date(selectedDate);
  if (maxDays <= 3) {
    const days2 = [];
    for (let i2 = -1; i2 < maxDays - 1; i2++) {
      days2.push(new Date(d2.getFullYear(), d2.getMonth(), d2.getDate() + i2));
    }
    return days2;
  }
  let dow = d2.getDay();
  if (weekStartsMonday) {
    dow = (dow + 6) % 7;
  }
  const start = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate() - dow);
  const days = [];
  for (let i2 = 0; i2 < maxDays; i2++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i2));
  }
  return days;
}
function layoutEvents$1(events, dayDate) {
  const dayStart = startOfDay$1(dayDate).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1e3;
  const items = [];
  for (const ev of events) {
    const evStart = parseISO$2(ev.start);
    const evEnd = parseISO$2(ev.end);
    const clampedStart = Math.max(evStart.getTime(), dayStart);
    const clampedEnd = Math.min(evEnd.getTime(), dayEnd);
    if (clampedEnd <= clampedStart) continue;
    const startMin = Math.round((clampedStart - dayStart) / 6e4);
    const endMin = Math.round((clampedEnd - dayStart) / 6e4);
    items.push({ event: ev, startMin, endMin: Math.max(endMin, startMin + 15) });
  }
  items.sort((a2, b2) => a2.startMin - b2.startMin || b2.endMin - b2.startMin - (a2.endMin - a2.startMin));
  const columns = [];
  const positioned = [];
  for (const item of items) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const lastEnd = columns[col][columns[col].length - 1];
      if (lastEnd <= item.startMin) {
        columns[col].push(item.endMin);
        positioned.push({ ...item, column: col, totalColumns: 0 });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([item.endMin]);
      positioned.push({ ...item, column: columns.length - 1, totalColumns: 0 });
    }
  }
  const totalCols = columns.length;
  for (const p2 of positioned) {
    p2.totalColumns = totalCols;
  }
  return positioned;
}
const HOURS$1 = Array.from({ length: 24 }, (_2, i2) => i2);
let CaleeWeekView = class extends i {
  constructor() {
    super(...arguments);
    this.events = [];
    this.calendars = /* @__PURE__ */ new Map();
    this.enabledCalendarIds = /* @__PURE__ */ new Set();
    this.selectedDate = /* @__PURE__ */ new Date();
    this.templates = [];
    this.tasks = [];
    this.weekStartsMonday = true;
    this.narrow = false;
    this._weekDays = [];
    this._allDayByDay = /* @__PURE__ */ new Map();
    this._timedByDay = /* @__PURE__ */ new Map();
    this._taskCountByDay = /* @__PURE__ */ new Map();
    this._now = /* @__PURE__ */ new Date();
    this._todayKey = dateKey$2(/* @__PURE__ */ new Date());
    this._timerHandle = 0;
    this._hasScrolled = false;
  }
  // ── Lifecycle ────────────────────────────────────────────────────────
  connectedCallback() {
    super.connectedCallback();
    this._timerHandle = window.setInterval(() => {
      this._now = /* @__PURE__ */ new Date();
      this._todayKey = dateKey$2(this._now);
    }, 6e4);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearInterval(this._timerHandle);
  }
  get _dayCount() {
    return this.narrow ? 3 : 7;
  }
  willUpdate(changed) {
    if (changed.has("selectedDate") || changed.has("weekStartsMonday") || changed.has("narrow")) {
      this._weekDays = getWeekDays(this.selectedDate, this.weekStartsMonday, this._dayCount);
    }
    if (changed.has("events") || changed.has("enabledCalendarIds") || changed.has("selectedDate") || changed.has("weekStartsMonday") || changed.has("narrow")) {
      this._categoriseEvents();
    }
    if (changed.has("tasks")) {
      this._buildTaskCountMap();
    }
  }
  firstUpdated() {
    this._scrollToCurrentTime();
  }
  updated(_changed) {
  }
  _scrollToCurrentTime() {
    if (this._hasScrolled) return;
    this._hasScrolled = true;
    requestAnimationFrame(() => {
      if (!this._scrollContainer) return;
      const hourPx = 60;
      const now = /* @__PURE__ */ new Date();
      const target = Math.max(0, now.getHours() - 2) * hourPx;
      this._scrollContainer.scrollTop = target;
    });
  }
  _categoriseEvents() {
    const allDay = /* @__PURE__ */ new Map();
    const timed = /* @__PURE__ */ new Map();
    const visible = this.events.filter(
      (e2) => !e2.deleted_at && this.enabledCalendarIds.has(e2.calendar_id)
    );
    for (const ev of visible) {
      if (ev.all_day) {
        const start = parseISO$2(ev.start);
        const end = parseISO$2(ev.end);
        const cursor = new Date(start);
        const endDay = new Date(end.getTime() - 1);
        while (cursor <= endDay) {
          const key = dateKey$2(cursor);
          if (!allDay.has(key)) allDay.set(key, []);
          allDay.get(key).push(ev);
          cursor.setDate(cursor.getDate() + 1);
        }
      } else {
        const start = parseISO$2(ev.start);
        const end = parseISO$2(ev.end);
        const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        while (cursor <= endDay) {
          const key = dateKey$2(cursor);
          if (!timed.has(key)) timed.set(key, []);
          timed.get(key).push(ev);
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }
    this._allDayByDay = allDay;
    this._timedByDay = timed;
  }
  /** Precompute task counts per day to avoid O(days x tasks) in render. */
  _buildTaskCountMap() {
    const map = /* @__PURE__ */ new Map();
    for (const t2 of this.tasks) {
      if (t2.due && !t2.completed && !t2.deleted_at) {
        const key = t2.due.slice(0, 10);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    this._taskCountByDay = map;
  }
  // ── Event handlers ───────────────────────────────────────────────────
  _onEventClick(e2, eventId) {
    e2.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("event-click", { detail: { eventId }, bubbles: true, composed: true })
    );
  }
  _onCellClick(dayKey, hour) {
    const hh = String(hour).padStart(2, "0");
    this.dispatchEvent(
      new CustomEvent("cell-click", {
        detail: { date: dayKey, time: `${hh}:00` },
        bubbles: true,
        composed: true
      })
    );
  }
  _onAllDayCellClick(dayKey) {
    this.dispatchEvent(
      new CustomEvent("cell-click", { detail: { date: dayKey }, bubbles: true, composed: true })
    );
  }
  // ── Render ───────────────────────────────────────────────────────────
  _renderAllDayRow() {
    const hasAny = this._weekDays.some(
      (d2) => (this._allDayByDay.get(dateKey$2(d2))?.length ?? 0) > 0
    );
    if (!hasAny) return A;
    return b`
      <div class="all-day-row" style="grid-template-columns: var(--grid-cols)">
        <div class="all-day-label">All day</div>
        ${this._weekDays.map((d2) => {
      const key = dateKey$2(d2);
      const evts = this._allDayByDay.get(key) ?? [];
      return b`
            <div class="all-day-cell" @click=${() => this._onAllDayCellClick(key)}>
              ${evts.map((ev) => {
        const cal = this.calendars.get(ev.calendar_id);
        const color = cal?.color ?? "var(--primary-color)";
        const isRecurring = !!ev.recurrence_rule;
        return b`
                  <div
                    class="all-day-chip"
                    style="--chip-color: ${color}"
                    @click=${(e2) => this._onEventClick(e2, ev.id)}
                  >${isRecurring ? b`<span class="te-recur" title="Recurring">&#x1F501; </span>` : A}${ev.title}</div>
                `;
      })}
            </div>
          `;
    })}
      </div>
    `;
  }
  _renderDayHeaders() {
    return this._weekDays.map((d2) => {
      const key = dateKey$2(d2);
      const isToday2 = key === this._todayKey;
      const isSelected = sameDay(d2, this.selectedDate);
      const classes = ["day-header"];
      if (isToday2) classes.push("today");
      if (isSelected) classes.push("selected");
      const taskCount = this._taskCountByDay.get(key) ?? 0;
      return b`<div class=${classes.join(" ")}>${fmtDayHeader(d2)}${taskCount > 0 ? b`<span class="day-task-count">${taskCount}</span>` : A}</div>`;
    });
  }
  _renderCurrentTimeLine(dayDate) {
    const key = dateKey$2(dayDate);
    if (key !== this._todayKey) return A;
    const mins = minutesInDay$1(this._now);
    const pct = mins / 1440 * 100;
    return b`<div class="now-line" style="top: ${pct}%"></div>`;
  }
  _renderTimedEvents(dayDate) {
    const key = dateKey$2(dayDate);
    const dayEvents = this._timedByDay.get(key) ?? [];
    const positioned = layoutEvents$1(dayEvents, dayDate);
    return positioned.map((p2) => {
      const cal = this.calendars.get(p2.event.calendar_id);
      const color = cal?.color ?? "var(--primary-color)";
      const topPct = p2.startMin / 1440 * 100;
      const heightPct = (p2.endMin - p2.startMin) / 1440 * 100;
      const widthPct = 100 / p2.totalColumns;
      const leftPct = p2.column * widthPct;
      const startDate = parseISO$2(p2.event.start);
      const endDate = parseISO$2(p2.event.end);
      const tplEmoji = p2.event.template_id ? this.templates.find((t2) => t2.id === p2.event.template_id)?.emoji ?? "" : "";
      const isRecurring = !!p2.event.recurrence_rule;
      return b`
        <div
          class="timed-event"
          style="
            top: ${topPct}%;
            height: ${heightPct}%;
            left: ${leftPct}%;
            width: ${widthPct}%;
            --chip-color: ${color};
          "
          title="${p2.event.title}"
          @click=${(e2) => this._onEventClick(e2, p2.event.id)}
        >
          <span class="te-title">${tplEmoji ? b`<span class="te-emoji">${tplEmoji}</span>` : A}${isRecurring ? b`<span class="te-recur" title="Recurring">&#x1F501;</span>` : A}${p2.event.title}</span>
          <span class="te-time">${fmtTime$1(startDate)} - ${fmtTime$1(endDate)}</span>
        </div>
      `;
    });
  }
  _renderTimeGrid() {
    return b`
      <div class="time-grid-scroll">
        <div class="time-grid" style="grid-template-columns: var(--grid-cols)">
          <!-- Hour labels column -->
          <div class="hour-labels">
            ${HOURS$1.map(
      (h2) => b`<div class="hour-label"><span>${fmtHour$1(h2)}</span></div>`
    )}
          </div>

          <!-- Day columns -->
          ${this._weekDays.map((d2) => {
      const key = dateKey$2(d2);
      const isToday2 = key === this._todayKey;
      return b`
              <div class="day-column ${isToday2 ? "today-col" : ""}">
                ${HOURS$1.map(
        (h2) => b`
                    <div
                      class="hour-cell"
                      @click=${() => this._onCellClick(key, h2)}
                    ></div>
                  `
      )}
                <div class="events-layer">
                  ${this._renderTimedEvents(d2)}
                  ${this._renderCurrentTimeLine(d2)}
                </div>
              </div>
            `;
    })}
        </div>
      </div>
    `;
  }
  render() {
    const cols = this._dayCount;
    const labelW = this.narrow ? "40px" : "56px";
    const gridCols = `${labelW} repeat(${cols}, 1fr)`;
    return b`
      <div class="week-view" style="--grid-cols: ${gridCols}">
        <!-- Day name headers -->
        <div class="headers" style="grid-template-columns: ${gridCols}">
          <div class="corner"></div>
          ${this._renderDayHeaders()}
        </div>

        ${this._renderAllDayRow()}
        ${this._renderTimeGrid()}
      </div>
    `;
  }
};
CaleeWeekView.styles = i$3`
    :host {
      display: block;
      --hour-height: 60px;
      --day-count: 7;
      --label-width: 56px;
      height: 100%;
    }

    .week-view {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    /* ── Header ────────────────────────────────────────────────────── */

    .headers {
      display: grid;
      grid-template-columns: var(--label-width) repeat(var(--day-count, 7), 1fr);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      flex-shrink: 0;
    }

    .corner {
      /* Empty top-left corner */
    }

    .day-header {
      text-align: center;
      padding: 8px 4px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
    }

    .day-header.today {
      color: var(--primary-color, #03a9f4);
    }

    .day-header.selected {
      font-weight: 700;
    }

    .day-task-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 14px;
      height: 14px;
      border-radius: 7px;
      background: var(--secondary-text-color, #999);
      color: #fff;
      font-size: 0.55rem;
      font-weight: 600;
      margin-left: 4px;
      padding: 0 3px;
      vertical-align: middle;
    }

    /* ── All-day row ───────────────────────────────────────────────── */

    .all-day-row {
      display: grid;
      grid-template-columns: var(--label-width) repeat(var(--day-count, 7), 1fr);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      flex-shrink: 0;
      min-height: 28px;
    }

    .all-day-label {
      font-size: 0.65rem;
      color: var(--secondary-text-color, #666);
      padding: 4px;
      display: flex;
      align-items: start;
    }

    .all-day-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 2px;
      border-left: 1px solid var(--divider-color, #e0e0e0);
      cursor: pointer;
    }

    .all-day-chip {
      background: color-mix(in srgb, var(--chip-color) 12%, transparent);
      color: var(--primary-text-color, #212121);
      border-left: 3px solid var(--chip-color);
      font-size: 0.7rem;
      border-radius: 4px;
      padding: 1px 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }

    .all-day-chip:hover {
      background: color-mix(in srgb, var(--chip-color) 20%, transparent);
    }

    /* ── Time grid (scrollable) ────────────────────────────────────── */

    .time-grid-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .time-grid {
      display: grid;
      grid-template-columns: var(--label-width) repeat(var(--day-count, 7), 1fr);
      position: relative;
      height: calc(24 * var(--hour-height));
    }

    /* ── Hour labels ───────────────────────────────────────────────── */

    .hour-labels {
      display: flex;
      flex-direction: column;
    }

    .hour-label {
      height: var(--hour-height);
      display: flex;
      align-items: start;
      justify-content: flex-end;
      padding-right: 8px;
      box-sizing: border-box;
    }

    .hour-label span {
      font-size: 0.65rem;
      color: var(--secondary-text-color, #666);
      transform: translateY(-0.4em);
    }

    /* ── Day column ────────────────────────────────────────────────── */

    .day-column {
      position: relative;
      border-left: 1px solid var(--divider-color, #e0e0e0);
    }

    .day-column.today-col {
      background: color-mix(
        in srgb,
        var(--primary-color, #03a9f4) 4%,
        transparent
      );
    }

    .hour-cell {
      height: var(--hour-height);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      box-sizing: border-box;
      cursor: pointer;
    }

    .hour-cell:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
    }

    /* ── Events layer (positioned absolutely over hour cells) ─────── */

    .events-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .timed-event {
      position: absolute;
      left: 0;
      right: 0;
      background: color-mix(in srgb, var(--chip-color) 12%, transparent);
      color: var(--primary-text-color, #212121);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 0.7rem;
      overflow: hidden;
      cursor: pointer;
      pointer-events: auto;
      box-sizing: border-box;
      border-left: 4px solid var(--chip-color);
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-height: 18px;
      z-index: 1;
      transition: background 0.15s ease;
    }

    .timed-event:hover {
      background: color-mix(in srgb, var(--chip-color) 20%, transparent);
      z-index: 2;
    }

    .te-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--primary-text-color, #212121);
    }

    .te-emoji {
      margin-right: 2px;
    }

    .te-recur {
      font-size: 0.55rem;
      opacity: 0.6;
      margin-right: 1px;
    }

    .te-time {
      font-size: 0.6rem;
      opacity: 0.7;
      white-space: nowrap;
      color: var(--secondary-text-color, #666);
    }

    /* ── Current-time line ─────────────────────────────────────────── */

    .now-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--error-color, #f44336);
      z-index: 3;
      pointer-events: none;
    }

    .now-line::before {
      content: "";
      position: absolute;
      left: -5px;
      top: -4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--error-color, #f44336);
    }

    /* ── Responsive ────────────────────────────────────────────────── */

    @media (max-width: 600px) {
      :host {
        --hour-height: 48px;
        --label-width: 40px;
      }

      .day-header {
        font-size: 0.75rem;
        padding: 6px 2px;
      }

      .hour-label span {
        font-size: 0.6rem;
      }

      .timed-event {
        font-size: 0.65rem;
        padding: 2px 4px;
      }

      .te-time {
        display: none;
      }
    }
  `;
__decorateClass$g([
  n2({ attribute: false })
], CaleeWeekView.prototype, "events", 2);
__decorateClass$g([
  n2({ attribute: false })
], CaleeWeekView.prototype, "calendars", 2);
__decorateClass$g([
  n2({ attribute: false })
], CaleeWeekView.prototype, "enabledCalendarIds", 2);
__decorateClass$g([
  n2({ attribute: false })
], CaleeWeekView.prototype, "selectedDate", 2);
__decorateClass$g([
  n2({ attribute: false })
], CaleeWeekView.prototype, "templates", 2);
__decorateClass$g([
  n2({ attribute: false })
], CaleeWeekView.prototype, "tasks", 2);
__decorateClass$g([
  n2({ type: Boolean })
], CaleeWeekView.prototype, "weekStartsMonday", 2);
__decorateClass$g([
  n2({ type: Boolean, reflect: true })
], CaleeWeekView.prototype, "narrow", 2);
__decorateClass$g([
  r()
], CaleeWeekView.prototype, "_weekDays", 2);
__decorateClass$g([
  r()
], CaleeWeekView.prototype, "_allDayByDay", 2);
__decorateClass$g([
  r()
], CaleeWeekView.prototype, "_timedByDay", 2);
__decorateClass$g([
  r()
], CaleeWeekView.prototype, "_taskCountByDay", 2);
__decorateClass$g([
  r()
], CaleeWeekView.prototype, "_now", 2);
__decorateClass$g([
  e(".time-grid-scroll")
], CaleeWeekView.prototype, "_scrollContainer", 2);
CaleeWeekView = __decorateClass$g([
  t("calee-week-view")
], CaleeWeekView);
var __defProp$f = Object.defineProperty;
var __getOwnPropDesc$f = Object.getOwnPropertyDescriptor;
var __decorateClass$f = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$f(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$f(target, key, result);
  return result;
};
function parseISO$1(iso) {
  return new Date(iso);
}
function dateKey$1(d2) {
  const y3 = d2.getFullYear();
  const m2 = String(d2.getMonth() + 1).padStart(2, "0");
  const day = String(d2.getDate()).padStart(2, "0");
  return `${y3}-${m2}-${day}`;
}
function fmtTime(d2) {
  const h2 = d2.getHours();
  const m2 = d2.getMinutes();
  const ampm = h2 >= 12 ? "PM" : "AM";
  const h12 = h2 % 12 || 12;
  return m2 === 0 ? `${h12} ${ampm}` : `${h12}:${String(m2).padStart(2, "0")} ${ampm}`;
}
function fmtHour(hour) {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}
function fmtDayTitle(d2) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  return `${days[d2.getDay()]}, ${months[d2.getMonth()]} ${d2.getDate()}`;
}
function startOfDay(d2) {
  return new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
}
function minutesInDay(d2) {
  return d2.getHours() * 60 + d2.getMinutes();
}
function layoutEvents(events, dayDate) {
  const dayStart = startOfDay(dayDate).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1e3;
  const items = [];
  for (const ev of events) {
    const evStart = parseISO$1(ev.start);
    const evEnd = parseISO$1(ev.end);
    const clampedStart = Math.max(evStart.getTime(), dayStart);
    const clampedEnd = Math.min(evEnd.getTime(), dayEnd);
    if (clampedEnd <= clampedStart) continue;
    const startMin = Math.round((clampedStart - dayStart) / 6e4);
    const endMin = Math.round((clampedEnd - dayStart) / 6e4);
    items.push({ event: ev, startMin, endMin: Math.max(endMin, startMin + 15) });
  }
  items.sort(
    (a2, b2) => a2.startMin - b2.startMin || b2.endMin - b2.startMin - (a2.endMin - a2.startMin)
  );
  const columns = [];
  const positioned = [];
  for (const item of items) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const lastEnd = columns[col][columns[col].length - 1];
      if (lastEnd <= item.startMin) {
        columns[col].push(item.endMin);
        positioned.push({ ...item, column: col, totalColumns: 0 });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([item.endMin]);
      positioned.push({ ...item, column: columns.length - 1, totalColumns: 0 });
    }
  }
  const totalCols = Math.max(columns.length, 1);
  for (const p2 of positioned) {
    p2.totalColumns = totalCols;
  }
  return positioned;
}
const HOURS = Array.from({ length: 24 }, (_2, i2) => i2);
let CaleeDayView = class extends i {
  constructor() {
    super(...arguments);
    this.events = [];
    this.calendars = /* @__PURE__ */ new Map();
    this.enabledCalendarIds = /* @__PURE__ */ new Set();
    this.selectedDate = /* @__PURE__ */ new Date();
    this._allDayEvents = [];
    this._timedEvents = [];
    this._now = /* @__PURE__ */ new Date();
    this._todayKey = dateKey$1(/* @__PURE__ */ new Date());
    this._timerHandle = 0;
    this._hasScrolled = false;
  }
  // ── Lifecycle ────────────────────────────────────────────────────────
  connectedCallback() {
    super.connectedCallback();
    this._timerHandle = window.setInterval(() => {
      this._now = /* @__PURE__ */ new Date();
      this._todayKey = dateKey$1(this._now);
    }, 6e4);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearInterval(this._timerHandle);
  }
  willUpdate(changed) {
    if (changed.has("events") || changed.has("enabledCalendarIds") || changed.has("selectedDate")) {
      this._categoriseEvents();
    }
  }
  firstUpdated() {
    this._scrollToCurrentTime();
  }
  updated(_changed) {
  }
  _scrollToCurrentTime() {
    if (this._hasScrolled) return;
    this._hasScrolled = true;
    requestAnimationFrame(() => {
      if (!this._scrollContainer) return;
      const hourPx = 60;
      const now = /* @__PURE__ */ new Date();
      const target = Math.max(0, now.getHours() - 2) * hourPx;
      this._scrollContainer.scrollTop = target;
    });
  }
  _categoriseEvents() {
    const visible = this.events.filter(
      (e2) => !e2.deleted_at && this.enabledCalendarIds.has(e2.calendar_id)
    );
    const dayStart = startOfDay(this.selectedDate);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1e3);
    const allDay = [];
    const timed = [];
    for (const ev of visible) {
      const evStart = parseISO$1(ev.start);
      const evEnd = parseISO$1(ev.end);
      if (evEnd.getTime() <= dayStart.getTime() || evStart.getTime() >= dayEnd.getTime()) {
        continue;
      }
      if (ev.all_day) {
        allDay.push(ev);
      } else {
        timed.push(ev);
      }
    }
    this._allDayEvents = allDay;
    this._timedEvents = timed;
  }
  // ── Event handlers ───────────────────────────────────────────────────
  _onEventClick(e2, eventId) {
    e2.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("event-click", { detail: { eventId }, bubbles: true, composed: true })
    );
  }
  _onCellClick(hour) {
    const key = dateKey$1(this.selectedDate);
    const hh = String(hour).padStart(2, "0");
    this.dispatchEvent(
      new CustomEvent("cell-click", {
        detail: { date: key, time: `${hh}:00` },
        bubbles: true,
        composed: true
      })
    );
  }
  _onAllDayClick() {
    const key = dateKey$1(this.selectedDate);
    this.dispatchEvent(
      new CustomEvent("cell-click", { detail: { date: key }, bubbles: true, composed: true })
    );
  }
  // ── Render ───────────────────────────────────────────────────────────
  _renderAllDayBar() {
    if (this._allDayEvents.length === 0) return A;
    return b`
      <div class="all-day-bar" @click=${this._onAllDayClick}>
        <div class="all-day-label">All day</div>
        <div class="all-day-events">
          ${this._allDayEvents.map((ev) => {
      const cal = this.calendars.get(ev.calendar_id);
      const color = cal?.color ?? "var(--primary-color)";
      return b`
              <div
                class="all-day-chip"
                style="--chip-color: ${color}"
                @click=${(e2) => this._onEventClick(e2, ev.id)}
              >${ev.title}</div>
            `;
    })}
        </div>
      </div>
    `;
  }
  _renderCurrentTimeLine() {
    const key = dateKey$1(this.selectedDate);
    if (key !== this._todayKey) return A;
    const mins = minutesInDay(this._now);
    const pct = mins / 1440 * 100;
    return b`<div class="now-line" style="top: ${pct}%"></div>`;
  }
  _renderTimedEvents() {
    const positioned = layoutEvents(this._timedEvents, this.selectedDate);
    return positioned.map((p2) => {
      const cal = this.calendars.get(p2.event.calendar_id);
      const color = cal?.color ?? "var(--primary-color)";
      const topPct = p2.startMin / 1440 * 100;
      const heightPct = (p2.endMin - p2.startMin) / 1440 * 100;
      const widthPct = 100 / p2.totalColumns;
      const leftPct = p2.column * widthPct;
      const evStart = parseISO$1(p2.event.start);
      const evEnd = parseISO$1(p2.event.end);
      const durationMin = p2.endMin - p2.startMin;
      const showDetails = durationMin >= 45;
      const notePreview = p2.event.note.length > 60 ? p2.event.note.slice(0, 60) + "..." : p2.event.note;
      return b`
        <div
          class="timed-event ${durationMin < 30 ? "compact" : ""}"
          style="
            top: ${topPct}%;
            height: ${heightPct}%;
            left: ${leftPct}%;
            width: ${widthPct}%;
            --chip-color: ${color};
          "
          title="${p2.event.title}"
          @click=${(e2) => this._onEventClick(e2, p2.event.id)}
        >
          <div class="te-header">
            <span class="te-title">${p2.event.title}</span>
            <span class="te-time">${fmtTime(evStart)} - ${fmtTime(evEnd)}</span>
          </div>
          ${showDetails && p2.event.note ? b`<div class="te-note">${notePreview}</div>` : A}
        </div>
      `;
    });
  }
  render() {
    const isToday2 = dateKey$1(this.selectedDate) === this._todayKey;
    return b`
      <div class="day-view">
        <div class="day-title ${isToday2 ? "today" : ""}">
          ${fmtDayTitle(this.selectedDate)}
          ${isToday2 ? b`<span class="today-badge">Today</span>` : A}
        </div>

        ${this._renderAllDayBar()}

        <div class="time-grid-scroll">
          <div class="time-grid">
            <div class="hour-labels">
              ${HOURS.map(
      (h2) => b`<div class="hour-label"><span>${fmtHour(h2)}</span></div>`
    )}
            </div>
            <div class="day-column ${isToday2 ? "today-col" : ""}">
              ${HOURS.map(
      (h2) => b`
                  <div class="hour-cell" @click=${() => this._onCellClick(h2)}></div>
                `
    )}
              <div class="events-layer">
                ${this._renderTimedEvents()}
                ${this._renderCurrentTimeLine()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
CaleeDayView.styles = i$3`
    :host {
      display: block;
      --hour-height: 60px;
      height: 100%;
    }

    .day-view {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    /* ── Day title header ──────────────────────────────────────────── */

    .day-title {
      padding: 12px 16px 8px;
      font-size: 1rem;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .day-title.today {
      color: var(--primary-color, #03a9f4);
    }

    .today-badge {
      font-size: 0.7rem;
      font-weight: 600;
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-radius: 10px;
      padding: 2px 8px;
    }

    /* ── All-day bar ───────────────────────────────────────────────── */

    .all-day-bar {
      display: flex;
      align-items: start;
      gap: 8px;
      padding: 6px 16px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      flex-shrink: 0;
      cursor: pointer;
    }

    .all-day-label {
      font-size: 0.7rem;
      color: var(--secondary-text-color, #666);
      padding-top: 2px;
      flex-shrink: 0;
    }

    .all-day-events {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .all-day-chip {
      background: var(--chip-color);
      color: #fff;
      font-size: 0.8rem;
      border-radius: 4px;
      padding: 3px 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      transition: filter 0.15s ease;
    }

    .all-day-chip:hover {
      filter: brightness(1.15);
    }

    /* ── Time grid (scrollable) ────────────────────────────────────── */

    .time-grid-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .time-grid {
      display: grid;
      grid-template-columns: 56px 1fr;
      position: relative;
      height: calc(24 * var(--hour-height));
    }

    /* ── Hour labels ───────────────────────────────────────────────── */

    .hour-labels {
      display: flex;
      flex-direction: column;
    }

    .hour-label {
      height: var(--hour-height);
      display: flex;
      align-items: start;
      justify-content: flex-end;
      padding-right: 12px;
      box-sizing: border-box;
    }

    .hour-label span {
      font-size: 0.7rem;
      color: var(--secondary-text-color, #666);
      transform: translateY(-0.4em);
    }

    /* ── Day column ────────────────────────────────────────────────── */

    .day-column {
      position: relative;
      border-left: 1px solid var(--divider-color, #e0e0e0);
    }

    .day-column.today-col {
      background: color-mix(
        in srgb,
        var(--primary-color, #03a9f4) 4%,
        transparent
      );
    }

    .hour-cell {
      height: var(--hour-height);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      box-sizing: border-box;
      cursor: pointer;
    }

    .hour-cell:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
    }

    /* ── Events layer ──────────────────────────────────────────────── */

    .events-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .timed-event {
      position: absolute;
      background: var(--chip-color);
      color: #fff;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 0.85rem;
      overflow: hidden;
      cursor: pointer;
      pointer-events: auto;
      box-sizing: border-box;
      border-left: 4px solid color-mix(in srgb, var(--chip-color) 65%, #000);
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-height: 22px;
      z-index: 1;
      transition: filter 0.15s ease;
    }

    .timed-event.compact {
      padding: 2px 8px;
      font-size: 0.75rem;
    }

    .timed-event.compact .te-header {
      flex-direction: row;
      gap: 6px;
      align-items: center;
    }

    .timed-event:hover {
      filter: brightness(1.12);
      z-index: 2;
    }

    .te-header {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .te-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .te-time {
      font-size: 0.75rem;
      opacity: 0.85;
      white-space: nowrap;
    }

    .compact .te-time {
      font-size: 0.65rem;
    }

    .te-note {
      font-size: 0.7rem;
      opacity: 0.8;
      line-height: 1.3;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    /* ── Current-time line ─────────────────────────────────────────── */

    .now-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--error-color, #f44336);
      z-index: 3;
      pointer-events: none;
    }

    .now-line::before {
      content: "";
      position: absolute;
      left: -5px;
      top: -4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--error-color, #f44336);
    }

    /* ── Responsive ────────────────────────────────────────────────── */

    @media (max-width: 600px) {
      :host {
        --hour-height: 48px;
      }

      .day-title {
        font-size: 0.9rem;
        padding: 8px 12px 6px;
      }

      .time-grid {
        grid-template-columns: 40px 1fr;
      }

      .hour-label span {
        font-size: 0.6rem;
      }

      .timed-event {
        font-size: 0.75rem;
        padding: 4px 8px;
      }

      .te-note {
        display: none;
      }
    }
  `;
__decorateClass$f([
  n2({ attribute: false })
], CaleeDayView.prototype, "events", 2);
__decorateClass$f([
  n2({ attribute: false })
], CaleeDayView.prototype, "calendars", 2);
__decorateClass$f([
  n2({ attribute: false })
], CaleeDayView.prototype, "enabledCalendarIds", 2);
__decorateClass$f([
  n2({ attribute: false })
], CaleeDayView.prototype, "selectedDate", 2);
__decorateClass$f([
  r()
], CaleeDayView.prototype, "_allDayEvents", 2);
__decorateClass$f([
  r()
], CaleeDayView.prototype, "_timedEvents", 2);
__decorateClass$f([
  r()
], CaleeDayView.prototype, "_now", 2);
__decorateClass$f([
  e(".time-grid-scroll")
], CaleeDayView.prototype, "_scrollContainer", 2);
CaleeDayView = __decorateClass$f([
  t("calee-day-view")
], CaleeDayView);
var __defProp$e = Object.defineProperty;
var __getOwnPropDesc$e = Object.getOwnPropertyDescriptor;
var __decorateClass$e = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$e(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$e(target, key, result);
  return result;
};
function parseISO(iso) {
  return new Date(iso);
}
function dateKey(d2) {
  const y3 = d2.getFullYear();
  const m2 = String(d2.getMonth() + 1).padStart(2, "0");
  const day = String(d2.getDate()).padStart(2, "0");
  return `${y3}-${m2}-${day}`;
}
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];
function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const weeks = [];
  let week = new Array(startDow).fill(null);
  for (let d2 = 1; d2 <= daysInMonth; d2++) {
    week.push(d2);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}
let CaleeYearView = class extends i {
  constructor() {
    super(...arguments);
    this.events = [];
    this.calendars = /* @__PURE__ */ new Map();
    this.enabledCalendarIds = /* @__PURE__ */ new Set();
    this.selectedDate = /* @__PURE__ */ new Date();
    this._eventsByDay = /* @__PURE__ */ new Map();
    this._todayKey = dateKey(/* @__PURE__ */ new Date());
  }
  // ── Lifecycle ────────────────────────────────────────────────────────
  willUpdate(changed) {
    if (changed.has("events") || changed.has("enabledCalendarIds") || changed.has("calendars")) {
      this._buildEventMap();
    }
  }
  _buildEventMap() {
    const map = /* @__PURE__ */ new Map();
    const visible = this.events.filter(
      (e2) => !e2.deleted_at && this.enabledCalendarIds.has(e2.calendar_id)
    );
    for (const ev of visible) {
      const evStart = parseISO(ev.start);
      const evEnd = parseISO(ev.end);
      const d2 = new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate());
      const endDay = new Date(evEnd.getFullYear(), evEnd.getMonth(), evEnd.getDate());
      if (evEnd.getHours() === 0 && evEnd.getMinutes() === 0 && evEnd.getTime() > evStart.getTime()) {
        endDay.setDate(endDay.getDate() - 1);
      }
      while (d2 <= endDay) {
        const key = dateKey(d2);
        if (!map.has(key)) map.set(key, []);
        const cal = this.calendars.get(ev.calendar_id);
        const color = cal?.color ?? "var(--primary-color)";
        const existing = map.get(key);
        if (!existing.find((e2) => e2.calendarId === ev.calendar_id)) {
          existing.push({ calendarId: ev.calendar_id, color });
        }
        d2.setDate(d2.getDate() + 1);
      }
    }
    this._eventsByDay = map;
  }
  // ── Event handlers ───────────────────────────────────────────────────
  _onDayClick(year, month, day) {
    const m2 = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${year}-${m2}-${dd}`;
    this.dispatchEvent(
      new CustomEvent("day-click", {
        detail: { date: dateStr },
        bubbles: true,
        composed: true
      })
    );
  }
  // ── Render ───────────────────────────────────────────────────────────
  _renderMiniMonth(year, month) {
    const weeks = buildMonthGrid(year, month);
    return b`
      <div class="mini-month">
        <div class="mini-month-title">${MONTH_NAMES[month]}</div>
        <div class="mini-grid">
          ${DAY_HEADERS.map((h2) => b`<div class="day-header">${h2}</div>`)}
          ${weeks.map(
      (week) => week.map((day) => {
        if (day === null) {
          return b`<div class="day-cell empty"></div>`;
        }
        const m2 = String(month + 1).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        const key = `${year}-${m2}-${dd}`;
        const isToday2 = key === this._todayKey;
        const dots = this._eventsByDay.get(key) ?? [];
        const maxDots = dots.slice(0, 3);
        return b`
                <div
                  class="day-cell ${isToday2 ? "today" : ""}"
                  @click=${() => this._onDayClick(year, month, day)}
                >
                  <span class="day-num">${day}</span>
                  ${maxDots.length > 0 ? b`<div class="dot-row">
                        ${maxDots.map(
          (d2) => b`<span class="dot" style="background:${d2.color}"></span>`
        )}
                      </div>` : A}
                </div>
              `;
      })
    )}
        </div>
      </div>
    `;
  }
  render() {
    const year = this.selectedDate.getFullYear();
    this._todayKey = dateKey(/* @__PURE__ */ new Date());
    return b`
      <div class="year-view">
        <div class="months-grid">
          ${Array.from({ length: 12 }, (_2, i2) => this._renderMiniMonth(year, i2))}
        </div>
      </div>
    `;
  }
};
CaleeYearView.styles = i$3`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    .year-view {
      padding: 16px;
    }

    .months-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      max-width: 1100px;
      margin: 0 auto;
    }

    /* ── Mini month ────────────────────────────────────────────── */

    .mini-month {
      background: var(--card-background-color, #fff);
      border-radius: 12px;
      padding: 12px;
      border: 1px solid var(--divider-color, #e0e0e0);
    }

    .mini-month-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      text-align: center;
      margin-bottom: 8px;
    }

    .mini-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
    }

    .day-header {
      font-size: 0.6rem;
      font-weight: 600;
      color: var(--secondary-text-color, #999);
      text-align: center;
      padding: 2px 0 4px;
      text-transform: uppercase;
    }

    .day-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 28px;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.12s;
      position: relative;
      padding: 2px 0;
    }

    .day-cell.empty {
      cursor: default;
    }

    .day-cell:not(.empty):hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .day-cell.today .day-num {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    .day-num {
      font-size: 0.7rem;
      color: var(--primary-text-color, #212121);
      line-height: 1;
    }

    .dot-row {
      display: flex;
      gap: 2px;
      margin-top: 2px;
      justify-content: center;
    }

    .dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* ── Responsive ────────────────────────────────────────────── */

    @media (max-width: 900px) {
      .months-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
    }

    @media (max-width: 700px) {
      .months-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .year-view {
        padding: 12px;
      }
    }

    @media (max-width: 400px) {
      .months-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
  `;
__decorateClass$e([
  n2({ attribute: false })
], CaleeYearView.prototype, "events", 2);
__decorateClass$e([
  n2({ attribute: false })
], CaleeYearView.prototype, "calendars", 2);
__decorateClass$e([
  n2({ attribute: false })
], CaleeYearView.prototype, "enabledCalendarIds", 2);
__decorateClass$e([
  n2({ attribute: false })
], CaleeYearView.prototype, "selectedDate", 2);
__decorateClass$e([
  r()
], CaleeYearView.prototype, "_eventsByDay", 2);
CaleeYearView = __decorateClass$e([
  t("calee-year-view")
], CaleeYearView);
var __defProp$d = Object.defineProperty;
var __getOwnPropDesc$d = Object.getOwnPropertyDescriptor;
var __decorateClass$d = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$d(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$d(target, key, result);
  return result;
};
function toLocalDateKey(iso) {
  const d2 = new Date(iso);
  const y3 = d2.getFullYear();
  const m2 = String(d2.getMonth() + 1).padStart(2, "0");
  const day = String(d2.getDate()).padStart(2, "0");
  return `${y3}-${m2}-${day}`;
}
function formatDateHeader(dateKey2, today) {
  const [y3, m2, d2] = dateKey2.split("-").map(Number);
  const target = new Date(y3, m2 - 1, d2);
  const todayKey = toLocalDateKey(today.toISOString());
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowKey = toLocalDateKey(tomorrowDate.toISOString());
  if (dateKey2 === todayKey) return "Today";
  if (dateKey2 === tomorrowKey) return "Tomorrow";
  return target.toLocaleDateString(void 0, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}
function formatTime$1(iso) {
  return new Date(iso).toLocaleTimeString(void 0, {
    hour: "numeric",
    minute: "2-digit"
  });
}
let CaleeAgendaView = class extends i {
  constructor() {
    super(...arguments);
    this.events = [];
    this.calendars = /* @__PURE__ */ new Map();
    this._groups = [];
  }
  willUpdate(changed) {
    if (changed.has("events")) {
      this._buildGroups();
    }
  }
  _buildGroups() {
    const now = /* @__PURE__ */ new Date();
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setDate(cutoff.getDate() + 14);
    const visible = this.events.filter((e2) => {
      if (e2.deleted_at) return false;
      const start = new Date(e2.start);
      return start >= new Date(now.toDateString()) && start <= cutoff;
    }).sort((a2, b2) => new Date(a2.start).getTime() - new Date(b2.start).getTime());
    const map = /* @__PURE__ */ new Map();
    for (const ev of visible) {
      const key = toLocalDateKey(ev.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    this._groups = [...map.entries()].map(([dateKey2, events]) => ({
      dateKey: dateKey2,
      label: formatDateHeader(dateKey2, now),
      events
    }));
  }
  _calendarColor(calendarId) {
    return this.calendars.get(calendarId)?.color ?? "#9e9e9e";
  }
  _onEventClick(ev) {
    this.dispatchEvent(
      new CustomEvent("event-select", {
        detail: { event: ev },
        bubbles: true,
        composed: true
      })
    );
  }
  render() {
    if (this._groups.length === 0) {
      return b`<div class="empty">No upcoming events</div>`;
    }
    return b`
      ${this._groups.map(
      (g2) => b`
          <div class="date-group">
            <div class="date-header">${g2.label}</div>
            ${g2.events.map((ev) => this._renderEvent(ev))}
          </div>
        `
    )}
    `;
  }
  _renderEvent(ev) {
    const color = this._calendarColor(ev.calendar_id);
    return b`
      <div class="event-row" @click=${() => this._onEventClick(ev)}>
        <span class="dot" style="background:${color}"></span>
        <div class="event-info">
          <div class="event-title">${ev.title}</div>
          <div class="event-time">
            ${ev.all_day ? b`<span class="all-day-badge">All day</span>` : b`${formatTime$1(ev.start)} &ndash; ${formatTime$1(ev.end)}`}
          </div>
          ${ev.note ? b`<div class="event-note">${ev.note}</div>` : A}
        </div>
      </div>
    `;
  }
};
CaleeAgendaView.styles = i$3`
    :host {
      display: block;
      padding: 16px;
      --agenda-bg: var(--card-background-color, #fff);
      --agenda-border: var(--divider-color, #e0e0e0);
      --agenda-text: var(--primary-text-color, #212121);
      --agenda-secondary: var(--secondary-text-color, #757575);
    }

    .empty {
      text-align: center;
      padding: 48px 16px;
      color: var(--agenda-secondary);
      font-size: 14px;
    }

    .date-group + .date-group {
      margin-top: 24px;
    }

    .date-header {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--agenda-secondary);
      padding: 0 0 8px;
      border-bottom: 1px solid var(--agenda-border);
      margin-bottom: 8px;
    }

    .event-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 4px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .event-row:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .dot {
      flex-shrink: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-top: 5px;
    }

    .event-info {
      flex: 1;
      min-width: 0;
    }

    .event-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--agenda-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .event-time {
      font-size: 12px;
      color: var(--agenda-secondary);
      margin-top: 2px;
    }

    .event-note {
      font-size: 12px;
      color: var(--agenda-secondary);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0.8;
    }

    .all-day-badge {
      font-size: 11px;
      font-weight: 500;
      background: var(--primary-color, #03a9f4);
      color: #fff;
      padding: 1px 6px;
      border-radius: 4px;
    }
  `;
__decorateClass$d([
  n2({ type: Array })
], CaleeAgendaView.prototype, "events", 2);
__decorateClass$d([
  n2({ attribute: false })
], CaleeAgendaView.prototype, "calendars", 2);
__decorateClass$d([
  r()
], CaleeAgendaView.prototype, "_groups", 2);
CaleeAgendaView = __decorateClass$d([
  t("calee-agenda-view")
], CaleeAgendaView);
const SWIPE_THRESHOLD = 80;
const swipeStyles = i$3`
  .swipe-row-wrapper {
    position: relative;
    overflow: hidden;
  }

  .swipe-action-complete {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 80px;
    background: #4caf50;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 22px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .swipe-action-delete {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 80px;
    background: #f44336;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 22px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .swipe-row-wrapper.swiping .swipe-action-complete,
  .swipe-row-wrapper.swiping .swipe-action-delete {
    opacity: 1;
  }

  .swipe-row-inner {
    position: relative;
    z-index: 1;
    background: var(--card-background-color, #fff);
    transition: transform 0.2s ease;
  }

  .swipe-row-inner.dragging {
    transition: none;
  }
`;
function createSwipeState() {
  return {
    touchStartX: 0,
    touchStartY: 0,
    touchCurrentX: 0,
    swipingId: null,
    directionLocked: false
  };
}
function handleTouchStart(state, e2, itemId) {
  state.touchStartX = e2.touches[0].clientX;
  state.touchStartY = e2.touches[0].clientY;
  state.touchCurrentX = e2.touches[0].clientX;
  state.swipingId = itemId;
  state.directionLocked = false;
}
function handleTouchMove(state, e2) {
  if (!state.swipingId) return 0;
  const currentX = e2.touches[0].clientX;
  const currentY = e2.touches[0].clientY;
  if (!state.directionLocked) {
    const dx = Math.abs(currentX - state.touchStartX);
    const dy = Math.abs(currentY - state.touchStartY);
    if (dx < 8 && dy < 8) return 0;
    if (dy > dx) {
      state.swipingId = null;
      return 0;
    }
    state.directionLocked = true;
  }
  e2.preventDefault();
  state.touchCurrentX = currentX;
  return currentX - state.touchStartX;
}
function handleTouchEnd(state) {
  const id = state.swipingId;
  if (!id) return { action: null, itemId: "" };
  const delta = state.touchCurrentX - state.touchStartX;
  state.swipingId = null;
  state.touchStartX = 0;
  state.touchCurrentX = 0;
  state.directionLocked = false;
  if (delta < -SWIPE_THRESHOLD) {
    return { action: "complete", itemId: id };
  }
  if (delta > SWIPE_THRESHOLD) {
    return { action: "delete", itemId: id };
  }
  return { action: null, itemId: id };
}
function getSwipeDelta(state, itemId) {
  if (state.swipingId !== itemId) return 0;
  return state.touchCurrentX - state.touchStartX;
}
var __defProp$c = Object.defineProperty;
var __getOwnPropDesc$c = Object.getOwnPropertyDescriptor;
var __decorateClass$c = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$c(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$c(target, key, result);
  return result;
};
function todayISO$1() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function tomorrowISO() {
  const d2 = /* @__PURE__ */ new Date();
  d2.setDate(d2.getDate() + 1);
  return d2.toISOString().slice(0, 10);
}
function nextWeekISO() {
  const d2 = /* @__PURE__ */ new Date();
  d2.setDate(d2.getDate() + 7);
  return d2.toISOString().slice(0, 10);
}
function isToday(iso) {
  return iso.slice(0, 10) === todayISO$1();
}
function isUpcoming(iso) {
  return iso.slice(0, 10) > todayISO$1();
}
function isPast(iso) {
  return iso.slice(0, 10) < todayISO$1();
}
function formatDue(iso) {
  const dateStr = iso.slice(0, 10);
  if (dateStr === todayISO$1()) return "Today";
  if (dateStr === tomorrowISO()) return "Tomorrow";
  const d2 = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
  return d2.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
const RECURRENCE_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Fortnightly",
  monthly: "Monthly",
  weekdays: "Weekdays"
};
function formatRecurrence(rule) {
  return RECURRENCE_LABELS[rule] ?? rule;
}
let CaleeTasksView = class extends i {
  constructor() {
    super(...arguments);
    this.tasks = [];
    this.lists = [];
    this.presets = [];
    this.activeView = "inbox";
    this.narrow = false;
    this._quickAddText = "";
    this._quickAddFocused = false;
    this._selectedDatePill = "none";
    this._selectedRecurrence = "none";
    this._customDate = "";
    this._renderLimit = 100;
    this._editingTaskId = null;
    this._editTitle = "";
    this._editDatePill = "none";
    this._editCustomDate = "";
    this._editRecurrence = "none";
    this._showMoreOptions = false;
    this._quickAddNote = "";
    this._swipe = createSwipeState();
    this._confirmDeleteId = null;
    this._boundHashChange = this._checkHashForTaskId.bind(this);
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("hashchange", this._boundHashChange);
    this._checkHashForTaskId();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("hashchange", this._boundHashChange);
  }
  updated(changed) {
    if (changed.has("activeView")) {
      this._resetQuickAdd();
    }
    if (changed.has("tasks")) {
      this._checkHashForTaskId();
    }
  }
  /** If the URL hash is #/tasks/<taskId>, auto-expand that task for inline editing. */
  _checkHashForTaskId() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const parts = hash.split("/");
    if (parts[0] === "tasks" && parts[1] && parts[1].length > 0) {
      const taskId = parts[1];
      const task = this.tasks.find((t2) => t2.id === taskId);
      if (task) {
        this._startEdit(task);
        window.location.hash = "#/tasks";
      }
    }
  }
  /* ── Quick-add defaults per tab ─────────────────────────────────── */
  get _defaultDatePill() {
    switch (this.activeView) {
      case "today":
        return "today";
      case "upcoming":
        return "tomorrow";
      default:
        return "none";
    }
  }
  _resetQuickAdd() {
    this._quickAddText = "";
    this._selectedDatePill = this._defaultDatePill;
    this._selectedRecurrence = "none";
    this._customDate = "";
    this._quickAddNote = "";
    this._showMoreOptions = false;
  }
  /* ── Resolve due date from pill ─────────────────────────────────── */
  _resolveDue(pill, customDate) {
    switch (pill) {
      case "today":
        return todayISO$1();
      case "tomorrow":
        return tomorrowISO();
      case "nextweek":
        return nextWeekISO();
      case "custom":
        return customDate || void 0;
      default:
        return void 0;
    }
  }
  /* ── Determine date pill from an existing due string ────────────── */
  _datePillFromDue(due) {
    if (!due) return { pill: "none", customDate: "" };
    const dateStr = due.slice(0, 10);
    if (dateStr === todayISO$1()) return { pill: "today", customDate: "" };
    if (dateStr === tomorrowISO()) return { pill: "tomorrow", customDate: "" };
    const nextWk = nextWeekISO();
    if (dateStr === nextWk) return { pill: "nextweek", customDate: "" };
    return { pill: "custom", customDate: dateStr };
  }
  /* ── Filtered tasks ─────────────────────────────────────────────── */
  get _filteredTasks() {
    const active = this.tasks.filter((t2) => !t2.completed && !t2.deleted_at);
    switch (this.activeView) {
      case "today":
        return active.filter((t2) => t2.due && isToday(t2.due));
      case "upcoming":
        return active.filter((t2) => t2.due && isUpcoming(t2.due)).sort(
          (a2, b2) => new Date(a2.due).getTime() - new Date(b2.due).getTime()
        );
      case "inbox":
      default:
        return active;
    }
  }
  /* ── Events ─────────────────────────────────────────────────────── */
  /** Presets relevant to the current inbox view. */
  get _inboxPresets() {
    return this.presets.filter((p2) => p2.list_id === "inbox");
  }
  _onPresetClick(preset) {
    this.dispatchEvent(
      new CustomEvent("preset-add", {
        detail: { presetId: preset.id },
        bubbles: true,
        composed: true
      })
    );
  }
  _showMore() {
    this._renderLimit += 100;
  }
  _switchTab(view) {
    this._renderLimit = 100;
    this.activeView = view;
    this.dispatchEvent(
      new CustomEvent("view-change", {
        detail: { view },
        bubbles: true,
        composed: true
      })
    );
  }
  _onComplete(task, e2) {
    e2.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("task-complete", {
        detail: { taskId: task.id },
        bubbles: true,
        composed: true
      })
    );
  }
  _onQuickAddKeydown(e2) {
    if (e2.key === "Enter" && this._quickAddText.trim()) {
      const due = this._resolveDue(this._selectedDatePill, this._customDate);
      const recurrence = this._selectedRecurrence !== "none" && due ? this._selectedRecurrence : void 0;
      const detail = {
        title: this._quickAddText.trim(),
        due,
        recurrence_rule: recurrence
      };
      if (this._quickAddNote.trim()) {
        detail.note = this._quickAddNote.trim();
      }
      this.dispatchEvent(
        new CustomEvent("task-quick-add", {
          detail,
          bubbles: true,
          composed: true
        })
      );
      this._quickAddText = "";
      this._quickAddNote = "";
      this._showMoreOptions = false;
      this._inputEl.value = "";
      this._resetQuickAdd();
    }
  }
  _onInput(e2) {
    this._quickAddText = e2.target.value;
  }
  _onInputFocus() {
    this._quickAddFocused = true;
  }
  _onInputBlur() {
    setTimeout(() => {
      this._quickAddFocused = false;
    }, 200);
  }
  _selectDatePill(pill) {
    this._selectedDatePill = pill;
    if (pill === "none") {
      this._selectedRecurrence = "none";
    }
  }
  _selectRecurrence(pill) {
    this._selectedRecurrence = pill;
  }
  _onCustomDateChange(e2) {
    this._customDate = e2.target.value;
  }
  /* ── Task row click — dispatch event for panel detail drawer ───── */
  _onTaskRowClick(task) {
    this.dispatchEvent(
      new CustomEvent("task-click", {
        detail: { task },
        bubbles: true,
        composed: true
      })
    );
    if (this.narrow) {
      this._startEdit(task);
    }
  }
  /* ── Inline editing ─────────────────────────────────────────────── */
  _startEdit(task) {
    this._editingTaskId = task.id;
    this._editTitle = task.title;
    const { pill, customDate } = this._datePillFromDue(task.due);
    this._editDatePill = pill;
    this._editCustomDate = customDate;
    this._editRecurrence = task.recurrence_rule || "none";
  }
  _cancelEdit() {
    this._editingTaskId = null;
  }
  _saveEdit(task) {
    const due = this._resolveDue(this._editDatePill, this._editCustomDate);
    const recurrence = this._editRecurrence !== "none" && due ? this._editRecurrence : "";
    this.dispatchEvent(
      new CustomEvent("task-update", {
        detail: {
          taskId: task.id,
          version: task.version,
          title: this._editTitle.trim() || task.title,
          due: due ?? "",
          recurrence_rule: recurrence
        },
        bubbles: true,
        composed: true
      })
    );
    this._editingTaskId = null;
  }
  _onEditTitleInput(e2) {
    this._editTitle = e2.target.value;
  }
  _selectEditDatePill(pill) {
    this._editDatePill = pill;
    if (pill === "none") {
      this._editRecurrence = "none";
    }
  }
  _selectEditRecurrence(pill) {
    this._editRecurrence = pill;
  }
  _onEditCustomDateChange(e2) {
    this._editCustomDate = e2.target.value;
  }
  _onEditKeydown(e2, task) {
    if (e2.key === "Enter") {
      this._saveEdit(task);
    } else if (e2.key === "Escape") {
      this._cancelEdit();
    }
  }
  /* ── Swipe handlers (mobile) ───────────────────────────────────── */
  _onTouchStart(e2, itemId) {
    handleTouchStart(this._swipe, e2, itemId);
  }
  _onTouchMove(e2) {
    handleTouchMove(this._swipe, e2);
    this.requestUpdate();
  }
  _onTouchEnd(_e) {
    const result = handleTouchEnd(this._swipe);
    this.requestUpdate();
    if (!result.action) return;
    if (result.action === "complete") {
      this.dispatchEvent(
        new CustomEvent("task-complete", {
          detail: { taskId: result.itemId },
          bubbles: true,
          composed: true
        })
      );
    } else if (result.action === "delete") {
      this._confirmDeleteId = result.itemId;
    }
  }
  _confirmSwipeDelete() {
    if (!this._confirmDeleteId) return;
    this.dispatchEvent(
      new CustomEvent("task-delete", {
        detail: { taskId: this._confirmDeleteId },
        bubbles: true,
        composed: true
      })
    );
    this._confirmDeleteId = null;
  }
  _cancelSwipeDelete() {
    this._confirmDeleteId = null;
  }
  /* ── Progressive disclosure ────────────────────────────────────── */
  _toggleMoreOptions() {
    this._showMoreOptions = !this._showMoreOptions;
  }
  _onNoteInput(e2) {
    this._quickAddNote = e2.target.value;
  }
  /* ── Render ─────────────────────────────────────────────────────── */
  render() {
    const tabs = [
      { key: "inbox", label: "Inbox" },
      { key: "today", label: "Today" },
      { key: "upcoming", label: "Upcoming" }
    ];
    const filtered = this._filteredTasks;
    const showDatePills = this._quickAddFocused || this._quickAddText.length > 0;
    const hasDue = this._selectedDatePill !== "none";
    return b`
      <div class="tabs" role="tablist">
        ${tabs.map(
      (t2) => b`
            <button
              class="tab"
              role="tab"
              aria-selected=${this.activeView === t2.key}
              @click=${() => this._switchTab(t2.key)}
            >
              ${t2.label}
            </button>
          `
    )}
      </div>

      <div class="quick-add">
        <div class="quick-add-input-row">
          <input
            id="quick-add-input"
            type="text"
            placeholder="Add a task..."
            .value=${this._quickAddText}
            @input=${this._onInput}
            @keydown=${this._onQuickAddKeydown}
            @focus=${this._onInputFocus}
            @blur=${this._onInputBlur}
          />
        </div>

        <!-- Progressive disclosure: date pills shown on focus -->
        <div class="pills-date-container ${showDatePills ? "visible" : ""}">
          ${this._renderDatePills(
      this._selectedDatePill,
      this._customDate,
      (p2) => this._selectDatePill(p2),
      (e2) => this._onCustomDateChange(e2)
    )}
        </div>

        <!-- Progressive disclosure: recurrence pills shown after date selected -->
        <div class="pills-recurrence-container ${showDatePills && hasDue ? "visible" : ""}">
          ${hasDue ? this._renderRecurrencePills(
      this._selectedRecurrence,
      (p2) => this._selectRecurrence(p2)
    ) : A}
        </div>

        <!-- Progressive disclosure: "More options" toggle for note -->
        ${showDatePills ? b`
          <button class="more-options-toggle" @click=${this._toggleMoreOptions}>
            ${this._showMoreOptions ? "Less options" : "More options"}
          </button>
          ${this._showMoreOptions ? b`
            <textarea
              class="note-input"
              placeholder="Add a note..."
              .value=${this._quickAddNote}
              @input=${this._onNoteInput}
            ></textarea>
          ` : A}
        ` : A}
      </div>

      <!-- Swipe delete confirmation -->
      ${this._confirmDeleteId ? b`
            <div
              class="confirm-delete-overlay"
              @click=${(e2) => {
      if (e2.target.classList.contains("confirm-delete-overlay")) {
        this._cancelSwipeDelete();
      }
    }}
            >
              <div class="confirm-delete-dialog">
                <p>Delete this task?</p>
                <div class="confirm-delete-actions">
                  <button class="confirm-cancel" @click=${this._cancelSwipeDelete}>Cancel</button>
                  <button class="confirm-confirm" @click=${this._confirmSwipeDelete}>Delete</button>
                </div>
              </div>
            </div>
          ` : A}

      ${this.activeView === "inbox" && this._inboxPresets.length > 0 ? b`
            <div class="presets-section">
              <div class="presets-label">Quick add</div>
              <div class="presets-grid">
                ${this._inboxPresets.map(
      (p2) => b`
                    <button
                      class="preset-chip"
                      @click=${() => this._onPresetClick(p2)}
                      title="Add ${p2.title}"
                    >
                      ${p2.icon ? b`<ha-icon .icon=${p2.icon}></ha-icon>` : A}
                      ${p2.title}
                    </button>
                  `
    )}
              </div>
            </div>
          ` : A}

      ${filtered.length === 0 ? b`<div class="empty">No tasks</div>` : b`
            <ul class="task-list">
              ${filtered.slice(0, this._renderLimit).map(
      (t2) => this._editingTaskId === t2.id ? this._renderEditRow(t2) : this._renderTask(t2)
    )}
            </ul>
            ${filtered.length > this._renderLimit ? b`
                  <button
                    class="show-more-btn"
                    @click=${this._showMore}
                  >
                    Show more (${filtered.length - this._renderLimit} remaining)
                  </button>
                ` : A}
          `}
    `;
  }
  /* ── Date pills (reusable for quick-add and inline edit) ──────── */
  _renderDatePills(selected, customDate, onSelect, onCustomChange) {
    const pills = [
      { key: "today", label: "Today" },
      { key: "tomorrow", label: "Tomorrow" },
      { key: "nextweek", label: "Next week" },
      { key: "custom", label: "Custom" },
      { key: "none", label: "No date" }
    ];
    return b`
      <div class="pill-row">
        <span class="pill-label">Due</span>
        ${pills.map(
      (p2) => b`
            <button
              class="pill"
              aria-selected=${selected === p2.key}
              @click=${() => onSelect(p2.key)}
            >
              ${p2.label}
            </button>
          `
    )}
        ${selected === "custom" ? b`
              <input
                type="date"
                class="custom-date-input"
                .value=${customDate}
                @change=${onCustomChange}
              />
            ` : A}
      </div>
    `;
  }
  /* ── Recurrence pills (reusable) ──────────────────────────────── */
  _renderRecurrencePills(selected, onSelect) {
    const pills = [
      { key: "none", label: "None" },
      { key: "daily", label: "Daily" },
      { key: "weekly", label: "Weekly" },
      { key: "biweekly", label: "Fortnightly" },
      { key: "monthly", label: "Monthly" },
      { key: "weekdays", label: "Weekdays" }
    ];
    return b`
      <div class="pill-row">
        <span class="pill-label">Repeat</span>
        ${pills.map(
      (p2) => b`
            <button
              class="pill recurrence-pill"
              aria-selected=${selected === p2.key}
              @click=${() => onSelect(p2.key)}
            >
              ${p2.label}
            </button>
          `
    )}
      </div>
    `;
  }
  /* ── Task item rendering ──────────────────────────────────────── */
  _renderTask(task) {
    const overdue = task.due ? isPast(task.due) : false;
    const dueIsToday = task.due ? isToday(task.due) : false;
    const delta = getSwipeDelta(this._swipe, task.id);
    const isSwiping = this._swipe.swipingId === task.id;
    return b`
      <li class="swipe-row-wrapper ${isSwiping ? "swiping" : ""}">
        <!-- Swipe reveal backgrounds -->
        <div class="swipe-action-complete" aria-hidden="true">&#10003;</div>
        <div class="swipe-action-delete" aria-hidden="true">&#128465;</div>

        <div
          class="swipe-row-inner task-item ${isSwiping ? "dragging" : ""}"
          style="transform: translateX(${delta}px)"
          @click=${() => this._onTaskRowClick(task)}
          @touchstart=${(e2) => this._onTouchStart(e2, task.id)}
          @touchmove=${(e2) => this._onTouchMove(e2)}
          @touchend=${(e2) => this._onTouchEnd(e2)}
        >
          <button
            class="task-check"
            aria-label="Complete task"
            @click=${(e2) => this._onComplete(task, e2)}
          >
            <svg viewBox="0 0 16 16">
              <polyline points="3.5,8 6.5,11 12.5,5" />
            </svg>
          </button>

          <div class="task-body">
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
              ${task.due ? b`<span class="due-badge ${overdue ? "overdue" : ""} ${dueIsToday && !overdue ? "today" : ""}">
                    ${formatDue(task.due)}
                  </span>` : A}
              ${task.due && task.recurrence_rule ? b`<span class="meta-dot"></span>` : A}
              ${task.recurrence_rule ? b`<span class="recurrence-badge">
                    <span class="repeat-icon">&#x1f504;</span>
                    ${formatRecurrence(task.recurrence_rule)}
                  </span>` : A}
              ${task.related_event_id ? b`<svg class="linked-icon" viewBox="0 0 24 24">
                    <path
                      d="M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2zm-3-4h8v2H8z"
                    />
                  </svg>` : A}
            </div>
          </div>
        </div>
      </li>
    `;
  }
  /* ── Inline edit row ──────────────────────────────────────────── */
  _renderEditRow(task) {
    const editHasDue = this._editDatePill !== "none";
    return b`
      <li class="task-edit">
        <input
          type="text"
          class="edit-title-input"
          .value=${this._editTitle}
          @input=${this._onEditTitleInput}
          @keydown=${(e2) => this._onEditKeydown(e2, task)}
        />

        ${this._renderDatePills(
      this._editDatePill,
      this._editCustomDate,
      (p2) => this._selectEditDatePill(p2),
      (e2) => this._onEditCustomDateChange(e2)
    )}

        ${editHasDue ? this._renderRecurrencePills(
      this._editRecurrence,
      (p2) => this._selectEditRecurrence(p2)
    ) : A}

        <div class="edit-actions">
          <button class="btn btn-primary" @click=${() => this._saveEdit(task)}>
            Save
          </button>
          <button class="btn btn-secondary" @click=${this._cancelEdit}>
            Cancel
          </button>
        </div>
      </li>
    `;
  }
};
CaleeTasksView.styles = [swipeStyles, i$3`
    :host {
      display: block;
      padding: 16px;
      --task-bg: var(--card-background-color, #fff);
      --task-text: var(--primary-text-color, #212121);
      --task-secondary: var(--secondary-text-color, #757575);
      --task-border: var(--divider-color, #e0e0e0);
      --task-accent: var(--primary-color, #03a9f4);
      --task-error: var(--error-color, #f44336);
    }

    /* ── Tab bar ─────────────────────────────────────────────────── */

    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--task-border);
      padding-bottom: 8px;
    }

    .tab {
      font-size: 13px;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 16px;
      cursor: pointer;
      background: transparent;
      color: var(--task-secondary);
      border: none;
      transition: background 0.15s, color 0.15s;
    }
    .tab:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }
    .tab[aria-selected="true"] {
      background: var(--task-accent);
      color: #fff;
    }

    /* ── Quick-add ───────────────────────────────────────────────── */

    .quick-add {
      margin-bottom: 16px;
    }
    .quick-add-input-row {
      display: flex;
      gap: 8px;
    }
    .quick-add input[type="text"] {
      flex: 1;
      font-size: 14px;
      padding: 8px 12px;
      border: 1px solid var(--task-border);
      border-radius: 8px;
      background: var(--task-bg);
      color: var(--task-text);
      outline: none;
      transition: border-color 0.15s;
    }
    .quick-add input[type="text"]:focus {
      border-color: var(--task-accent);
    }
    .quick-add input[type="text"]::placeholder {
      color: var(--task-secondary);
    }

    /* ── Pill rows (shared) ──────────────────────────────────────── */

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .pill-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--task-secondary);
      align-self: center;
      margin-right: 4px;
    }

    .pill {
      font-size: 12px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 12px;
      cursor: pointer;
      background: transparent;
      color: var(--task-secondary);
      border: 1px solid var(--task-border);
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      white-space: nowrap;
      user-select: none;
    }
    .pill:hover {
      border-color: var(--task-accent);
      color: var(--task-text);
    }
    .pill[aria-selected="true"] {
      background: var(--task-accent);
      color: #fff;
      border-color: var(--task-accent);
    }

    .recurrence-pill[aria-selected="true"] {
      background: color-mix(in srgb, var(--task-accent) 15%, transparent);
      color: var(--task-accent);
      border-color: var(--task-accent);
    }

    .custom-date-input {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 8px;
      border: 1px solid var(--task-border);
      background: var(--task-bg);
      color: var(--task-text);
      outline: none;
      transition: border-color 0.15s;
    }
    .custom-date-input:focus {
      border-color: var(--task-accent);
    }

    /* (progressive disclosure containers moved below) */

    /* ── Task list ───────────────────────────────────────────────── */

    .task-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .task-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 4px;
      border-bottom: 1px solid var(--task-border);
      transition: background 0.15s;
      cursor: pointer;
    }
    .task-item:last-child {
      border-bottom: none;
    }
    .task-item:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .task-check {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid var(--task-border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.15s, background 0.15s;
      background: transparent;
      padding: 0;
      margin-top: 2px;
    }
    .task-check:hover {
      border-color: var(--task-accent);
    }
    .task-check svg {
      width: 12px;
      height: 12px;
      fill: none;
      stroke: transparent;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .task-check:hover svg {
      stroke: var(--task-accent);
    }

    .task-body {
      flex: 1;
      min-width: 0;
    }

    .task-title {
      font-size: 14px;
      color: var(--task-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 3px;
      flex-wrap: wrap;
    }

    .due-badge {
      font-size: 11px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--task-secondary);
    }
    .due-badge.overdue {
      background: var(--task-error);
      color: #fff;
    }
    .due-badge.today {
      color: var(--task-accent);
      font-weight: 600;
    }

    .recurrence-badge {
      font-size: 11px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 4px;
      color: var(--task-secondary);
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .recurrence-badge .repeat-icon {
      font-size: 11px;
      line-height: 1;
    }

    .meta-dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: var(--task-secondary);
      opacity: 0.5;
    }

    .linked-icon {
      width: 14px;
      height: 14px;
      fill: var(--task-secondary);
      flex-shrink: 0;
    }

    .empty {
      text-align: center;
      padding: 48px 16px;
      color: var(--task-secondary);
      font-size: 14px;
    }

    .show-more-btn {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 8px;
      background: var(--secondary-background-color, #f5f5f5);
      border: 1px solid var(--task-border);
      border-radius: 8px;
      color: var(--primary-color, #03a9f4);
      font-size: 14px;
      cursor: pointer;
      text-align: center;
    }
    .show-more-btn:hover {
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }

    /* ── Inline edit ─────────────────────────────────────────────── */

    .task-edit {
      padding: 10px 4px;
      border-bottom: 1px solid var(--task-border);
      background: var(--secondary-background-color, #fafafa);
      border-radius: 8px;
      margin-bottom: 2px;
    }

    .edit-title-input {
      width: 100%;
      font-size: 14px;
      padding: 6px 10px;
      border: 1px solid var(--task-border);
      border-radius: 6px;
      background: var(--task-bg);
      color: var(--task-text);
      outline: none;
      box-sizing: border-box;
    }
    .edit-title-input:focus {
      border-color: var(--task-accent);
    }

    .edit-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .btn {
      font-size: 12px;
      font-weight: 500;
      padding: 5px 14px;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: background 0.15s, color 0.15s;
    }
    .btn-primary {
      background: var(--task-accent);
      color: #fff;
    }
    .btn-primary:hover {
      filter: brightness(1.1);
    }
    .btn-secondary {
      background: transparent;
      color: var(--task-secondary);
      border: 1px solid var(--task-border);
    }
    .btn-secondary:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    /* ── Preset quick-add ──────────────────────────────────────── */

    .presets-section {
      margin-bottom: 16px;
    }

    .presets-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--task-secondary);
      margin: 0 0 6px;
    }

    .presets-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .preset-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px solid var(--task-border);
      background: var(--task-bg);
      color: var(--task-text);
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      user-select: none;
    }

    .preset-chip:hover {
      background: var(--secondary-background-color, #f5f5f5);
      border-color: var(--task-accent);
    }

    .preset-chip:active {
      background: var(--task-accent);
      color: #fff;
      border-color: var(--task-accent);
    }

    .preset-chip ha-icon,
    .preset-chip ha-svg-icon {
      --mdc-icon-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* ── Progressive disclosure ─────────────────────────────── */

    .pills-date-container {
      overflow: hidden;
      max-height: 0;
      opacity: 0;
      transition: max-height 0.2s ease, opacity 0.2s ease;
    }
    .pills-date-container.visible {
      max-height: 60px;
      opacity: 1;
    }

    .pills-recurrence-container {
      overflow: hidden;
      max-height: 0;
      opacity: 0;
      transition: max-height 0.2s ease, opacity 0.2s ease;
    }
    .pills-recurrence-container.visible {
      max-height: 60px;
      opacity: 1;
    }

    .more-options-toggle {
      font-size: 12px;
      color: var(--task-secondary);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 0;
      margin-top: 4px;
      transition: color 0.15s;
    }
    .more-options-toggle:hover {
      color: var(--task-accent);
    }

    .note-input {
      width: 100%;
      font-size: 13px;
      padding: 6px 10px;
      border: 1px solid var(--task-border);
      border-radius: 6px;
      background: var(--task-bg);
      color: var(--task-text);
      outline: none;
      box-sizing: border-box;
      resize: vertical;
      min-height: 36px;
      max-height: 120px;
      font-family: inherit;
      margin-top: 6px;
      overflow: auto;
    }
    .note-input:focus {
      border-color: var(--task-accent);
    }

    /* ── Swipe delete confirmation ─────────────────────────── */

    .confirm-delete-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .confirm-delete-dialog {
      background: var(--card-background-color, #fff);
      border-radius: 12px;
      padding: 20px;
      max-width: 320px;
      width: 100%;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .confirm-delete-dialog p {
      font-size: 14px;
      color: var(--task-text);
      margin: 0 0 16px;
    }

    .confirm-delete-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .confirm-delete-actions button {
      font-size: 13px;
      font-weight: 500;
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s;
    }

    .confirm-delete-actions button:hover {
      opacity: 0.9;
    }

    .confirm-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--task-text);
    }

    .confirm-confirm {
      background: var(--error-color, #f44336);
      color: #fff;
    }
  `];
__decorateClass$c([
  n2({ type: Array })
], CaleeTasksView.prototype, "tasks", 2);
__decorateClass$c([
  n2({ type: Array })
], CaleeTasksView.prototype, "lists", 2);
__decorateClass$c([
  n2({ type: Array })
], CaleeTasksView.prototype, "presets", 2);
__decorateClass$c([
  n2({ type: String })
], CaleeTasksView.prototype, "activeView", 2);
__decorateClass$c([
  n2({ type: Boolean, reflect: true })
], CaleeTasksView.prototype, "narrow", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_quickAddText", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_quickAddFocused", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_selectedDatePill", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_selectedRecurrence", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_customDate", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_renderLimit", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_editingTaskId", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_editTitle", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_editDatePill", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_editCustomDate", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_editRecurrence", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_showMoreOptions", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_quickAddNote", 2);
__decorateClass$c([
  r()
], CaleeTasksView.prototype, "_confirmDeleteId", 2);
__decorateClass$c([
  e("#quick-add-input")
], CaleeTasksView.prototype, "_inputEl", 2);
CaleeTasksView = __decorateClass$c([
  t("calee-tasks-view")
], CaleeTasksView);
var __defProp$b = Object.defineProperty;
var __getOwnPropDesc$b = Object.getOwnPropertyDescriptor;
var __decorateClass$b = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$b(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$b(target, key, result);
  return result;
};
const CATEGORY_META = {
  food: { label: "Food", icon: "🍎" },
  groceries: { label: "Groceries", icon: "🛒" },
  household: { label: "Household", icon: "🏠" },
  health: { label: "Health", icon: "💊" },
  personal: { label: "Personal", icon: "🧴" },
  other: { label: "Other", icon: "📦" }
};
const CATEGORY_ORDER = ["food", "groceries", "household", "health", "personal", "other"];
function categoryLabel(cat) {
  const lower = cat.toLowerCase();
  return CATEGORY_META[lower]?.label ?? (cat || "Uncategorised");
}
function categoryIcon(cat) {
  const lower = cat.toLowerCase();
  return CATEGORY_META[lower]?.icon ?? "📦";
}
function categorySortKey(cat) {
  const idx = CATEGORY_ORDER.indexOf(cat.toLowerCase());
  return idx >= 0 ? idx : CATEGORY_ORDER.length;
}
let CaleeShoppingView = class extends i {
  constructor() {
    super(...arguments);
    this.tasks = [];
    this.presets = [];
    this.listId = "shopping";
    this.toastMessage = "";
    this.currency = "$";
    this.budget = 0;
    this._quickAddText = "";
    this._selectedCategory = "";
    this._completedOpen = false;
    this._collapsedSections = /* @__PURE__ */ new Set();
    this._showCustomCategoryInput = false;
    this._customCategoryText = "";
    this._showPresetForm = false;
    this._presetFormCategory = "";
    this._presetFormTitle = "";
    this._presetFormEmoji = "";
    this._confirmDeletePresetId = null;
    this._pendingRenderLimit = 100;
    this._toastMessage = "";
    this._toastTimer = null;
    this._swipe = createSwipeState();
    this._confirmSwipeDeleteId = null;
  }
  /* ── Lifecycle ───────────────────────────────────────────────────── */
  updated(changedProps) {
    if (changedProps.has("toastMessage") && this.toastMessage) {
      this._showToast(this.toastMessage);
      this.dispatchEvent(
        new CustomEvent("toast-shown", { bubbles: true, composed: true })
      );
    }
  }
  /* ── Computed ────────────────────────────────────────────────────── */
  /** All non-deleted, non-completed tasks. */
  get _pending() {
    return this.tasks.filter((t2) => !t2.completed && !t2.deleted_at);
  }
  /** All non-deleted, completed tasks. */
  get _completed() {
    return this.tasks.filter((t2) => t2.completed && !t2.deleted_at);
  }
  /** Recurring "always" items that are pending. */
  get _alwaysItems() {
    return this._pending.filter((t2) => t2.is_recurring);
  }
  /** Non-recurring pending items grouped by category. */
  get _groupedPending() {
    const groups = /* @__PURE__ */ new Map();
    for (const t2 of this._pending) {
      if (t2.is_recurring) continue;
      const cat = t2.category || "other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(t2);
    }
    const sorted = /* @__PURE__ */ new Map();
    const keys = Array.from(groups.keys()).sort(
      (a2, b2) => categorySortKey(a2) - categorySortKey(b2)
    );
    for (const k2 of keys) {
      sorted.set(k2, groups.get(k2));
    }
    return sorted;
  }
  /** Total price of all pending items that have a price. */
  get _totalPrice() {
    return this._pending.reduce((sum, t2) => sum + (t2.price ?? 0), 0);
  }
  /** Group presets by category for rendering. */
  get _groupedPresets() {
    const groups = /* @__PURE__ */ new Map();
    for (const p2 of this.presets) {
      const cat = p2.category || "other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(p2);
    }
    return groups;
  }
  /** Available categories for the dropdown (built-in + custom from tasks + saved). */
  get _categoryOptions() {
    const cats = /* @__PURE__ */ new Set();
    for (const t2 of this.tasks) {
      if (t2.category) cats.add(t2.category);
    }
    for (const key of CATEGORY_ORDER) {
      cats.add(key);
    }
    try {
      const raw = localStorage.getItem("calee-custom-categories");
      if (raw) {
        const custom = JSON.parse(raw);
        for (const c2 of custom) {
          if (c2) cats.add(c2);
        }
      }
    } catch {
    }
    return Array.from(cats).sort(
      (a2, b2) => categorySortKey(a2) - categorySortKey(b2)
    );
  }
  /* ── Events ─────────────────────────────────────────────────────── */
  _completeItem(task) {
    this.dispatchEvent(
      new CustomEvent("task-complete", {
        detail: { taskId: task.id },
        bubbles: true,
        composed: true
      })
    );
  }
  _uncompleteItem(task) {
    this.dispatchEvent(
      new CustomEvent("task-uncomplete", {
        detail: { taskId: task.id },
        bubbles: true,
        composed: true
      })
    );
  }
  _onInput(e2) {
    this._quickAddText = e2.target.value;
  }
  _onCategoryChange(e2) {
    const val = e2.target.value;
    if (val === "__new__") {
      this._showCustomCategoryInput = true;
      this._customCategoryText = "";
      e2.target.value = "";
      this._selectedCategory = "";
    } else {
      this._selectedCategory = val;
      this._showCustomCategoryInput = false;
    }
  }
  _onCustomCategoryInput(e2) {
    this._customCategoryText = e2.target.value;
  }
  _onCustomCategoryKeydown(e2) {
    if (e2.key === "Enter") {
      e2.preventDefault();
      this._commitCustomCategory();
    } else if (e2.key === "Escape") {
      this._showCustomCategoryInput = false;
      this._customCategoryText = "";
    }
  }
  _commitCustomCategory() {
    const name = this._customCategoryText.trim().toLowerCase();
    if (!name) {
      this._showCustomCategoryInput = false;
      return;
    }
    try {
      const raw = localStorage.getItem("calee-custom-categories");
      const existing = raw ? JSON.parse(raw) : [];
      if (!existing.includes(name)) {
        existing.push(name);
        localStorage.setItem("calee-custom-categories", JSON.stringify(existing));
      }
    } catch {
    }
    this._selectedCategory = name;
    this._showCustomCategoryInput = false;
    this._customCategoryText = "";
  }
  _onPresetClick(preset) {
    this.dispatchEvent(
      new CustomEvent("preset-add", {
        detail: { presetId: preset.id },
        bubbles: true,
        composed: true
      })
    );
  }
  _openPresetForm(category) {
    this._showPresetForm = true;
    this._presetFormCategory = category;
    this._presetFormTitle = "";
    this._presetFormEmoji = "";
  }
  _closePresetForm() {
    this._showPresetForm = false;
    this._presetFormCategory = "";
    this._presetFormTitle = "";
    this._presetFormEmoji = "";
  }
  _submitPresetForm() {
    const title = this._presetFormTitle.trim();
    if (!title) return;
    const icon = this._presetFormEmoji || "";
    const category = this._presetFormCategory || "other";
    this.dispatchEvent(
      new CustomEvent("preset-create", {
        detail: {
          title,
          category,
          icon,
          list_id: this.listId
        },
        bubbles: true,
        composed: true
      })
    );
    this._closePresetForm();
  }
  _requestDeletePreset(presetId) {
    this._confirmDeletePresetId = presetId;
  }
  _confirmDeletePreset() {
    if (!this._confirmDeletePresetId) return;
    this.dispatchEvent(
      new CustomEvent("preset-delete", {
        detail: { presetId: this._confirmDeletePresetId },
        bubbles: true,
        composed: true
      })
    );
    this._confirmDeletePresetId = null;
  }
  _cancelDeletePreset() {
    this._confirmDeletePresetId = null;
  }
  _onQuickAddKeydown(e2) {
    if (e2.key === "Enter" && this._quickAddText.trim()) {
      let title = this._quickAddText.trim();
      let category = this._selectedCategory;
      const colonIdx = title.indexOf(":");
      if (colonIdx > 0 && colonIdx < 20) {
        const prefix = title.slice(0, colonIdx).trim().toLowerCase();
        const allCats = this._categoryOptions;
        if (CATEGORY_ORDER.includes(prefix) || Object.keys(CATEGORY_META).includes(prefix) || allCats.includes(prefix)) {
          category = prefix;
          title = title.slice(colonIdx + 1).trim();
        }
      }
      if (!title) return;
      this.dispatchEvent(
        new CustomEvent("task-quick-add", {
          detail: { title, category },
          bubbles: true,
          composed: true
        })
      );
      this._quickAddText = "";
      this._inputEl.value = "";
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._toastTimer) {
      clearTimeout(this._toastTimer);
      this._toastTimer = null;
    }
  }
  /** Show a toast notification that auto-dismisses. */
  _showToast(message) {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastMessage = message;
    this._toastTimer = setTimeout(() => {
      this._toastMessage = "";
      this._toastTimer = null;
    }, 2500);
  }
  _onQuantityChange(task, delta) {
    const current = task.quantity ?? 1;
    const newQty = Math.max(0.1, current + delta);
    this.dispatchEvent(
      new CustomEvent("task-quantity-update", {
        detail: { taskId: task.id, quantity: newQty, version: task.version },
        bubbles: true,
        composed: true
      })
    );
  }
  _onUnitChange(task, e2) {
    const unit = e2.target.value;
    this.dispatchEvent(
      new CustomEvent("task-unit-update", {
        detail: { taskId: task.id, unit, version: task.version },
        bubbles: true,
        composed: true
      })
    );
  }
  _onPriceChange(task, e2) {
    const input = e2.target;
    const raw = input.value.trim();
    const price = raw ? parseFloat(raw) : null;
    if (price !== null && isNaN(price)) return;
    this.dispatchEvent(
      new CustomEvent("task-price-update", {
        detail: { taskId: task.id, price, version: task.version },
        bubbles: true,
        composed: true
      })
    );
  }
  _toggleSection(key) {
    const next = new Set(this._collapsedSections);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this._collapsedSections = next;
  }
  _showMorePending() {
    this._pendingRenderLimit += 100;
  }
  /* ── Swipe handlers (mobile) ───────────────────────────────────── */
  _onTouchStart(e2, itemId) {
    handleTouchStart(this._swipe, e2, itemId);
  }
  _onTouchMove(e2) {
    handleTouchMove(this._swipe, e2);
    this.requestUpdate();
  }
  _onTouchEnd(_e) {
    const result = handleTouchEnd(this._swipe);
    this.requestUpdate();
    if (!result.action) return;
    if (result.action === "complete") {
      const task = this.tasks.find((t2) => t2.id === result.itemId);
      if (task) {
        if (task.completed) {
          this._uncompleteItem(task);
        } else {
          this._completeItem(task);
        }
      }
    } else if (result.action === "delete") {
      this._confirmSwipeDeleteId = result.itemId;
    }
  }
  _confirmSwipeDelete() {
    if (!this._confirmSwipeDeleteId) return;
    this.dispatchEvent(
      new CustomEvent("task-delete", {
        detail: { taskId: this._confirmSwipeDeleteId },
        bubbles: true,
        composed: true
      })
    );
    this._confirmSwipeDeleteId = null;
  }
  _cancelSwipeDelete() {
    this._confirmSwipeDeleteId = null;
  }
  /* ── Render ─────────────────────────────────────────────────────── */
  render() {
    const pending = this._pending;
    const completed = this._completed;
    const alwaysItems = this._alwaysItems;
    const grouped = this._groupedPending;
    return b`
      <!-- Quick-add bar -->
      <div class="quick-add">
        <input
          id="quick-add-input"
          type="text"
          placeholder="Add an item..."
          .value=${this._quickAddText}
          @input=${this._onInput}
          @keydown=${this._onQuickAddKeydown}
        />
        <select
          @change=${this._onCategoryChange}
          .value=${this._selectedCategory}
          title="Category"
        >
          <option value="">Category</option>
          ${this._categoryOptions.map(
      (cat) => b`
              <option value=${cat} ?selected=${this._selectedCategory === cat}>
                ${categoryLabel(cat)}
              </option>
            `
    )}
          <option value="__new__">+ New category</option>
        </select>
      </div>
      ${this._showCustomCategoryInput ? b`
            <div class="custom-category-row">
              <input
                type="text"
                class="custom-category-input"
                placeholder="Category name..."
                .value=${this._customCategoryText}
                @input=${this._onCustomCategoryInput}
                @keydown=${this._onCustomCategoryKeydown}
                autofocus
              />
              <button class="custom-category-ok" @click=${this._commitCustomCategory}>Add</button>
              <button class="custom-category-cancel" @click=${() => {
      this._showCustomCategoryInput = false;
      this._customCategoryText = "";
    }}>Cancel</button>
            </div>
          ` : A}

      <!-- Presets -->
      <div class="presets-section">
        ${this.presets.length > 0 ? Array.from(this._groupedPresets.entries()).map(
      ([category, presets]) => b`
                <div class="presets-category">${category}</div>
                <div class="presets-grid">
                  ${presets.map(
        (p2) => b`
                      <div class="preset-chip-wrapper">
                        <button
                          class="preset-chip"
                          @click=${() => this._onPresetClick(p2)}
                          title="Add ${p2.title}"
                        >
                          ${p2.icon ? p2.icon.startsWith("mdi:") ? b`<ha-icon .icon=${p2.icon}></ha-icon>` : b`<span>${p2.icon}</span>` : A}
                          ${p2.title}
                        </button>
                        <button
                          class="preset-delete-btn"
                          @click=${(e2) => {
          e2.stopPropagation();
          this._requestDeletePreset(p2.id);
        }}
                          title="Remove preset"
                        >
                          \u2715
                        </button>
                      </div>
                    `
      )}
                  <button
                    class="preset-add-chip"
                    @click=${() => this._openPresetForm(category)}
                    title="Add a preset to ${category}"
                  >
                    + Add
                  </button>
                </div>
              `
    ) : A}
        ${this.presets.length === 0 ? b`
              <div class="presets-grid">
                <button
                  class="preset-add-chip"
                  @click=${() => this._openPresetForm("groceries")}
                  title="Add a preset"
                >
                  + Add preset
                </button>
              </div>
            ` : A}
      </div>

      <!-- Preset add form -->
      ${this._showPresetForm ? this._renderPresetForm() : A}

      <!-- Swipe delete confirmation -->
      ${this._confirmSwipeDeleteId ? b`
            <div
              class="swipe-confirm-overlay"
              @click=${(e2) => {
      if (e2.target.classList.contains("swipe-confirm-overlay")) {
        this._cancelSwipeDelete();
      }
    }}
            >
              <div class="swipe-confirm-dialog">
                <p>Delete this item?</p>
                <div class="swipe-confirm-actions">
                  <button class="swipe-cancel-btn" @click=${this._cancelSwipeDelete}>Cancel</button>
                  <button class="swipe-delete-btn" @click=${this._confirmSwipeDelete}>Delete</button>
                </div>
              </div>
            </div>
          ` : A}

      <!-- Delete confirmation -->
      ${this._confirmDeletePresetId ? b`
            <div
              class="confirm-delete-overlay"
              @click=${(e2) => {
      if (e2.target.classList.contains("confirm-delete-overlay")) {
        this._cancelDeletePreset();
      }
    }}
            >
              <div class="confirm-delete-dialog">
                <p>Remove this preset?</p>
                <div class="confirm-delete-actions">
                  <button class="confirm-delete-cancel" @click=${this._cancelDeletePreset}>
                    Cancel
                  </button>
                  <button class="confirm-delete-confirm" @click=${this._confirmDeletePreset}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ` : A}

      <!-- Empty state -->
      ${pending.length === 0 && completed.length === 0 ? b`<div class="empty">Shopping list is empty</div>` : A}

      <!-- Always / recurring items -->
      ${alwaysItems.length > 0 ? this._renderSection(
      "always",
      "🔄",
      "Always",
      alwaysItems
    ) : A}

      <!-- Category groups (capped to _pendingRenderLimit total items) -->
      ${(() => {
      let remaining = this._pendingRenderLimit - alwaysItems.length;
      return Array.from(grouped.entries()).map(([cat, items]) => {
        if (remaining <= 0) return A;
        const visible = items.slice(0, remaining);
        remaining -= visible.length;
        return this._renderSection(
          cat,
          categoryIcon(cat),
          categoryLabel(cat),
          visible
        );
      });
    })()}

      ${pending.length > this._pendingRenderLimit ? b`
            <button
              class="show-more-btn"
              @click=${this._showMorePending}
            >
              Show more (${pending.length - this._pendingRenderLimit} remaining)
            </button>
          ` : A}

      <!-- Budget / totals -->
      ${this._renderTotals()}

      <!-- Completed section -->
      ${completed.length > 0 ? b`
            <button
              class="completed-header"
              @click=${() => this._completedOpen = !this._completedOpen}
            >
              <svg
                class="chevron ${this._completedOpen ? "open" : ""}"
                viewBox="0 0 24 24"
              >
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
              Completed
              <span class="completed-count">(${completed.length})</span>
            </button>

            ${this._completedOpen ? b`
                  <ul class="item-list completed-items">
                    ${completed.slice(0, this._pendingRenderLimit).map((t2) => this._renderItem(t2, true))}
                  </ul>
                  ${completed.length > this._pendingRenderLimit ? b`
                        <button
                          class="show-more-btn"
                          @click=${this._showMorePending}
                        >
                          Show more completed (${completed.length - this._pendingRenderLimit} remaining)
                        </button>
                      ` : A}
                ` : A}
          ` : A}

      <!-- Toast -->
      ${this._toastMessage ? b`<div class="toast">${this._toastMessage}</div>` : A}
    `;
  }
  _renderPresetForm() {
    const COMMON_EMOJI = [
      "🥛",
      "🍞",
      "🥚",
      "🍗",
      "🍎",
      "🥦",
      "🧀",
      "🥩",
      "🍕",
      "🍔",
      "🌮",
      "🍣",
      "🧃",
      "🥤",
      "☕",
      "🧹",
      "🧴",
      "🧼",
      "🦽",
      "🪥"
    ];
    return b`
      <div class="preset-form">
        <div class="preset-form-title">New Preset</div>

        <div class="emoji-grid">
          ${COMMON_EMOJI.map(
      (emoji) => b`
              <button
                type="button"
                class="emoji-btn"
                ?active=${this._presetFormEmoji === emoji}
                @click=${() => this._presetFormEmoji = emoji}
              >
                ${emoji}
              </button>
            `
    )}
        </div>

        <div class="preset-form-row">
          <label>Emoji</label>
          <input
            type="text"
            class="preset-emoji-input"
            maxlength="2"
            .value=${this._presetFormEmoji}
            @input=${(e2) => this._presetFormEmoji = e2.target.value}
            placeholder="\uD83D\uDED2"
          />
        </div>

        <div class="preset-form-row">
          <label>Title</label>
          <input
            type="text"
            class="preset-text-input"
            .value=${this._presetFormTitle}
            @input=${(e2) => this._presetFormTitle = e2.target.value}
            @keydown=${(e2) => {
      if (e2.key === "Enter") this._submitPresetForm();
      if (e2.key === "Escape") this._closePresetForm();
    }}
            placeholder="Item name"
            autofocus
          />
        </div>

        <div class="preset-form-row">
          <label>Category</label>
          <select
            .value=${this._presetFormCategory}
            @change=${(e2) => this._presetFormCategory = e2.target.value}
          >
            ${this._categoryOptions.map(
      (cat) => b`
                <option value=${cat} ?selected=${this._presetFormCategory === cat}>
                  ${categoryLabel(cat)}
                </option>
              `
    )}
          </select>
        </div>

        <div class="preset-form-actions">
          <button
            class="preset-form-btn preset-form-btn-cancel"
            @click=${this._closePresetForm}
          >
            Cancel
          </button>
          <button
            class="preset-form-btn preset-form-btn-add"
            ?disabled=${!this._presetFormTitle.trim()}
            @click=${this._submitPresetForm}
          >
            Add
          </button>
        </div>
      </div>
    `;
  }
  _renderSection(key, icon, label, items) {
    const collapsed = this._collapsedSections.has(key);
    return b`
      <div class="section">
        <button
          class="section-header"
          @click=${() => this._toggleSection(key)}
        >
          <svg
            class="chevron ${collapsed ? "" : "open"}"
            viewBox="0 0 24 24"
          >
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
          <span class="section-icon">${icon}</span>
          <span class="section-label">${label}</span>
          <span class="section-count">(${items.length})</span>
        </button>
        ${collapsed ? A : b`
              <ul class="item-list">
                ${items.map((t2) => this._renderItem(t2, false))}
              </ul>
            `}
      </div>
    `;
  }
  _renderItem(task, done) {
    const delta = getSwipeDelta(this._swipe, task.id);
    const isSwiping = this._swipe.swipingId === task.id;
    const qty = task.quantity ?? 1;
    const unit = task.unit ?? "";
    const UNIT_OPTIONS = ["", "pcs", "L", "kg", "pack", "box", "bag", "can", "bottle", "dozen"];
    const qtyLabel = qty > 1 ? `${qty % 1 === 0 ? qty.toFixed(0) : qty}x` : "";
    const unitLabel = unit ? ` ${unit}` : "";
    return b`
      <li class="swipe-row-wrapper ${isSwiping ? "swiping" : ""}">
        <div class="swipe-action-complete" aria-hidden="true">&#10003;</div>
        <div class="swipe-action-delete" aria-hidden="true">&#128465;</div>

        <div
          class="swipe-row-inner item ${isSwiping ? "dragging" : ""}"
          style="transform: translateX(${delta}px)"
          @touchstart=${(e2) => this._onTouchStart(e2, task.id)}
          @touchmove=${(e2) => this._onTouchMove(e2)}
          @touchend=${(e2) => this._onTouchEnd(e2)}
        >
          <button
            class="checkbox ${done ? "checked" : ""}"
            aria-label="${done ? "Undo" : "Complete"} item"
            @click=${() => done ? this._uncompleteItem(task) : this._completeItem(task)}
          >
            <svg viewBox="0 0 16 16">
              <polyline points="3.5,8 6.5,11 12.5,5" />
            </svg>
          </button>
          ${task.is_recurring && !done ? b`<span class="recurring-badge" title="Recurring item">\uD83D\uDD04</span>` : A}
          <span class="item-title">${qtyLabel ? b`<span class="item-qty-info">${qtyLabel}</span>` : A}${task.title}${unitLabel ? b`<span class="item-qty-info">${unitLabel}</span>` : A}</span>
          ${!done ? b`
                <span class="qty-controls">
                  <button class="qty-btn" @click=${() => this._onQuantityChange(task, -1)} title="Decrease" aria-label="Decrease quantity">-</button>
                  <span class="qty-value">${qty % 1 === 0 ? qty.toFixed(0) : qty}</span>
                  <button class="qty-btn" @click=${() => this._onQuantityChange(task, 1)} title="Increase" aria-label="Increase quantity">+</button>
                </span>
                <select
                  class="unit-select"
                  .value=${unit}
                  @change=${(e2) => this._onUnitChange(task, e2)}
                  title="Unit"
                  aria-label="Unit"
                >
                  ${UNIT_OPTIONS.map(
      (u2) => b`<option value=${u2} ?selected=${unit === u2}>${u2 || "--"}</option>`
    )}
                </select>
                <span class="item-price">
                  <input
                    type="text"
                    inputmode="decimal"
                    placeholder="${this.currency}"
                    .value=${task.price != null ? task.price.toFixed(2) : ""}
                    @change=${(e2) => this._onPriceChange(task, e2)}
                    aria-label="Price"
                  />
                </span>
              ` : A}
        </div>
      </li>
    `;
  }
  _renderTotals() {
    const total = this._totalPrice;
    const hasBudget = this.budget > 0;
    const hasAnyPrice = this._pending.some((t2) => t2.price != null && t2.price > 0);
    if (!hasAnyPrice && !hasBudget) return A;
    const percent = hasBudget ? Math.round(total / this.budget * 100) : 0;
    const progressClass = percent <= 75 ? "ok" : percent <= 100 ? "warn" : "over";
    const clampedPercent = Math.min(percent, 100);
    return b`
      <div class="totals">
        <div class="total-line">
          <span>Total</span>
          <span>
            ${this.currency}${total.toFixed(2)}
            ${hasBudget ? b` <span class="budget-text">/ ${this.currency}${this.budget.toFixed(2)} budget</span>` : A}
          </span>
        </div>
        ${hasBudget ? b`
              <div class="progress-bar">
                <div
                  class="progress-fill ${progressClass}"
                  style="width: ${clampedPercent}%"
                ></div>
              </div>
              <div class="percent-label">${percent}%</div>
            ` : A}
      </div>
    `;
  }
};
CaleeShoppingView.styles = [swipeStyles, i$3`
    :host {
      display: block;
      padding: 16px;
      --shop-bg: var(--card-background-color, #fff);
      --shop-text: var(--primary-text-color, #212121);
      --shop-secondary: var(--secondary-text-color, #757575);
      --shop-border: var(--divider-color, #e0e0e0);
      --shop-accent: var(--primary-color, #03a9f4);
      --shop-done: var(--disabled-text-color, #bdbdbd);
      --shop-success: #4caf50;
      --shop-warn: #ff9800;
      --shop-over: #f44336;
    }

    /* ── Quick-add ───────────────────────────────────────────────── */

    .quick-add {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .quick-add input {
      flex: 1;
      font-size: 14px;
      padding: 8px 12px;
      border: 1px solid var(--shop-border);
      border-radius: 8px;
      background: var(--shop-bg);
      color: var(--shop-text);
      outline: none;
      transition: border-color 0.15s;
    }
    .quick-add input:focus {
      border-color: var(--shop-accent);
    }
    .quick-add input::placeholder {
      color: var(--shop-secondary);
    }
    .quick-add select {
      font-size: 13px;
      padding: 8px 10px;
      border: 1px solid var(--shop-border);
      border-radius: 8px;
      background: var(--shop-bg);
      color: var(--shop-text);
      outline: none;
      cursor: pointer;
      min-width: 100px;
    }
    .quick-add select:focus {
      border-color: var(--shop-accent);
    }

    /* ── Custom category input ──────────────────────────────── */

    .custom-category-row {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      align-items: center;
    }

    .custom-category-input {
      flex: 1;
      font-size: 13px;
      padding: 6px 10px;
      border: 1px solid var(--shop-accent);
      border-radius: 8px;
      background: var(--shop-bg);
      color: var(--shop-text);
      outline: none;
      font-family: inherit;
    }

    .custom-category-input:focus {
      border-color: var(--shop-accent);
    }

    .custom-category-ok {
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      border-radius: 8px;
      background: var(--shop-accent);
      color: #fff;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s;
    }

    .custom-category-ok:hover {
      opacity: 0.9;
    }

    .custom-category-cancel {
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      border-radius: 8px;
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--shop-text);
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
    }

    .custom-category-cancel:hover {
      background: var(--shop-border);
    }

    /* ── Section ─────────────────────────────────────────────── */

    .section {
      margin-bottom: 12px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 4px;
      cursor: pointer;
      user-select: none;
      font-size: 13px;
      font-weight: 600;
      color: var(--shop-secondary);
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }
    .section-header:hover {
      color: var(--shop-text);
    }

    .section-icon {
      font-size: 16px;
      line-height: 1;
    }

    .section-label {
      flex: 1;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .section-count {
      font-weight: 400;
      font-size: 12px;
      color: var(--shop-done);
    }

    .chevron {
      width: 16px;
      height: 16px;
      transition: transform 0.2s ease;
      fill: currentColor;
      flex-shrink: 0;
    }
    .chevron.open {
      transform: rotate(90deg);
    }

    /* ── Item list ───────────────────────────────────────────────── */

    .item-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 4px;
      border-bottom: 1px solid var(--shop-border);
      transition: background 0.15s;
    }
    .item:last-child {
      border-bottom: none;
    }
    .item:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .checkbox {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 2px solid var(--shop-border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      padding: 0;
      transition: border-color 0.15s, background 0.15s;
    }
    .checkbox:hover {
      border-color: var(--shop-accent);
    }
    .checkbox svg {
      width: 12px;
      height: 12px;
      fill: none;
      stroke: transparent;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .checkbox:hover svg {
      stroke: var(--shop-accent);
    }

    .checkbox.checked {
      background: var(--shop-accent);
      border-color: var(--shop-accent);
    }
    .checkbox.checked svg {
      stroke: #fff;
    }

    .item-title {
      flex: 1;
      font-size: 14px;
      color: var(--shop-text);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-qty-info {
      font-size: 12px;
      color: var(--shop-secondary);
      font-weight: 500;
      flex-shrink: 0;
      margin-right: 2px;
    }

    .qty-controls {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }

    .qty-btn {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid var(--shop-border);
      background: var(--shop-bg);
      color: var(--shop-text);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background 0.15s, border-color 0.15s;
      line-height: 1;
    }

    .qty-btn:hover {
      border-color: var(--shop-accent);
      background: color-mix(in srgb, var(--shop-accent) 10%, transparent);
    }

    .qty-value {
      min-width: 24px;
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--shop-text);
    }

    .unit-select {
      font-size: 11px;
      padding: 2px 4px;
      border: 1px solid var(--shop-border);
      border-radius: 4px;
      background: var(--shop-bg);
      color: var(--shop-secondary);
      outline: none;
      cursor: pointer;
      max-width: 56px;
      flex-shrink: 0;
    }

    .unit-select:focus {
      border-color: var(--shop-accent);
    }

    .recurring-badge {
      font-size: 14px;
      line-height: 1;
      flex-shrink: 0;
      title: "Recurring item";
    }

    .item-price {
      flex-shrink: 0;
      width: 72px;
    }

    /* ── Toast notification ──────────────────────────────────── */

    .toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--primary-text-color, #212121);
      color: var(--card-background-color, #fff);
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      z-index: 300;
      pointer-events: none;
      animation: toast-fade 2.5s ease forwards;
    }

    @keyframes toast-fade {
      0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
      15% { opacity: 1; transform: translateX(-50%) translateY(0); }
      85% { opacity: 1; transform: translateX(-50%) translateY(0); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    }
    .item-price input {
      width: 100%;
      font-size: 13px;
      padding: 4px 6px;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      color: var(--shop-secondary);
      text-align: right;
      outline: none;
      transition: border-color 0.15s, background 0.15s;
      font-family: inherit;
    }
    .item-price input:focus {
      border-color: var(--shop-accent);
      background: var(--shop-bg);
      color: var(--shop-text);
    }
    .item-price input::placeholder {
      color: var(--shop-done);
    }

    /* ── Budget / totals bar ─────────────────────────────────── */

    .totals {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      background: var(--secondary-background-color, #f5f5f5);
    }

    .total-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 600;
      color: var(--shop-text);
      margin-bottom: 8px;
    }
    .total-line:last-child {
      margin-bottom: 0;
    }

    .budget-text {
      font-size: 12px;
      font-weight: 400;
      color: var(--shop-secondary);
    }

    .progress-bar {
      height: 8px;
      border-radius: 4px;
      background: var(--shop-border);
      overflow: hidden;
      margin-top: 6px;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease, background-color 0.3s ease;
    }

    .progress-fill.ok { background: var(--shop-success); }
    .progress-fill.warn { background: var(--shop-warn); }
    .progress-fill.over { background: var(--shop-over); }

    .percent-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--shop-secondary);
      margin-top: 4px;
      text-align: right;
    }

    /* ── Completed section ───────────────────────────────────────── */

    .completed-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 24px;
      padding: 8px 4px;
      cursor: pointer;
      user-select: none;
      font-size: 13px;
      font-weight: 600;
      color: var(--shop-secondary);
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }
    .completed-header:hover {
      color: var(--shop-text);
    }

    .completed-count {
      font-weight: 400;
      color: var(--shop-done);
    }

    .completed-items .item-title {
      text-decoration: line-through;
      color: var(--shop-done);
    }

    .empty {
      text-align: center;
      padding: 48px 16px;
      color: var(--shop-secondary);
      font-size: 14px;
    }

    .show-more-btn {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 8px;
      background: var(--secondary-background-color, #f5f5f5);
      border: 1px solid var(--shop-border);
      border-radius: 8px;
      color: var(--primary-color, #03a9f4);
      font-size: 14px;
      cursor: pointer;
      text-align: center;
    }
    .show-more-btn:hover {
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }

    /* ── Preset quick-add ──────────────────────────────────────── */

    .presets-section {
      margin-bottom: 16px;
    }

    .presets-category {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--shop-secondary);
      margin: 12px 0 6px;
    }

    .presets-category:first-child {
      margin-top: 0;
    }

    .presets-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .preset-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px solid var(--shop-border);
      background: var(--shop-bg);
      color: var(--shop-text);
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      user-select: none;
    }

    .preset-chip:hover {
      background: var(--secondary-background-color, #f5f5f5);
      border-color: var(--shop-accent);
    }

    .preset-chip:active {
      background: var(--shop-accent);
      color: #fff;
      border-color: var(--shop-accent);
    }

    .preset-chip ha-icon,
    .preset-chip ha-svg-icon {
      --mdc-icon-size: 16px;
      width: 16px;
      height: 16px;
    }

    .preset-icon {
      width: 16px;
      height: 16px;
      fill: currentColor;
      flex-shrink: 0;
    }

    /* ── Preset management ────────────────────────────────────── */

    .preset-chip-wrapper {
      position: relative;
      display: inline-flex;
    }

    .preset-delete-btn {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1px solid var(--shop-border);
      background: var(--card-background-color, #fff);
      color: var(--shop-secondary);
      font-size: 10px;
      line-height: 1;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0;
      z-index: 1;
      transition: background 0.15s, color 0.15s;
    }

    .preset-chip-wrapper:hover .preset-delete-btn {
      display: flex;
    }

    .preset-delete-btn:hover {
      background: var(--error-color, #f44336);
      border-color: var(--error-color, #f44336);
      color: #fff;
    }

    .preset-add-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px dashed var(--shop-border);
      background: transparent;
      color: var(--shop-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      font-family: inherit;
    }

    .preset-add-chip:hover {
      border-color: var(--shop-accent);
      color: var(--shop-accent);
      background: color-mix(in srgb, var(--shop-accent) 8%, transparent);
    }

    .preset-form {
      margin: 12px 0;
      padding: 16px;
      border: 1px solid var(--shop-border);
      border-radius: 12px;
      background: var(--card-background-color, #fff);
    }

    .preset-form-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--shop-text);
      margin: 0 0 12px;
    }

    .preset-form-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      align-items: center;
    }

    .preset-form-row label {
      font-size: 12px;
      font-weight: 500;
      color: var(--shop-secondary);
      width: 60px;
      flex-shrink: 0;
    }

    .preset-emoji-input {
      width: 48px;
      font-size: 20px;
      text-align: center;
      padding: 4px;
      border: 1px solid var(--shop-border);
      border-radius: 8px;
      background: var(--shop-bg);
      outline: none;
      font-family: inherit;
    }

    .preset-emoji-input:focus {
      border-color: var(--shop-accent);
    }

    .preset-text-input {
      flex: 1;
      font-size: 14px;
      padding: 6px 10px;
      border: 1px solid var(--shop-border);
      border-radius: 8px;
      background: var(--shop-bg);
      color: var(--shop-text);
      outline: none;
      font-family: inherit;
    }

    .preset-text-input:focus {
      border-color: var(--shop-accent);
    }

    .preset-form select {
      flex: 1;
      font-size: 13px;
      padding: 6px 10px;
      border: 1px solid var(--shop-border);
      border-radius: 8px;
      background: var(--shop-bg);
      color: var(--shop-text);
      outline: none;
      cursor: pointer;
      font-family: inherit;
    }

    .preset-form select:focus {
      border-color: var(--shop-accent);
    }

    .emoji-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 10px;
    }

    .emoji-btn {
      width: 32px;
      height: 32px;
      border: 1px solid var(--shop-border);
      border-radius: 6px;
      background: transparent;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, border-color 0.15s;
      padding: 0;
    }

    .emoji-btn:hover {
      background: var(--secondary-background-color, #f5f5f5);
      border-color: var(--shop-accent);
    }

    .emoji-btn[active] {
      background: color-mix(in srgb, var(--shop-accent) 15%, transparent);
      border-color: var(--shop-accent);
    }

    .preset-form-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .preset-form-btn {
      font-size: 13px;
      font-weight: 500;
      padding: 6px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, opacity 0.15s;
    }

    .preset-form-btn:hover {
      opacity: 0.9;
    }

    .preset-form-btn-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--shop-text);
    }

    .preset-form-btn-add {
      background: var(--shop-accent);
      color: #fff;
    }

    .preset-form-btn-add:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .confirm-delete-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .confirm-delete-dialog {
      background: var(--card-background-color, #fff);
      border-radius: 12px;
      padding: 20px;
      max-width: 320px;
      width: 100%;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .confirm-delete-dialog p {
      font-size: 14px;
      color: var(--shop-text);
      margin: 0 0 16px;
    }

    .confirm-delete-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .confirm-delete-actions button {
      font-size: 13px;
      font-weight: 500;
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s;
    }

    .confirm-delete-actions button:hover {
      opacity: 0.9;
    }

    .confirm-delete-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--shop-text);
    }

    .confirm-delete-confirm {
      background: var(--error-color, #f44336);
      color: #fff;
    }

    /* ── Swipe delete confirmation (separate from preset delete) ── */

    .swipe-confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .swipe-confirm-dialog {
      background: var(--card-background-color, #fff);
      border-radius: 12px;
      padding: 20px;
      max-width: 320px;
      width: 100%;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .swipe-confirm-dialog p {
      font-size: 14px;
      color: var(--shop-text);
      margin: 0 0 16px;
    }

    .swipe-confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .swipe-confirm-actions button {
      font-size: 13px;
      font-weight: 500;
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s;
    }

    .swipe-confirm-actions button:hover {
      opacity: 0.9;
    }

    .swipe-cancel-btn {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--shop-text);
    }

    .swipe-delete-btn {
      background: var(--error-color, #f44336);
      color: #fff;
    }
  `];
__decorateClass$b([
  n2({ type: Array })
], CaleeShoppingView.prototype, "tasks", 2);
__decorateClass$b([
  n2({ type: Array })
], CaleeShoppingView.prototype, "presets", 2);
__decorateClass$b([
  n2({ type: String })
], CaleeShoppingView.prototype, "listId", 2);
__decorateClass$b([
  n2({ type: String })
], CaleeShoppingView.prototype, "toastMessage", 2);
__decorateClass$b([
  n2({ type: String })
], CaleeShoppingView.prototype, "currency", 2);
__decorateClass$b([
  n2({ type: Number })
], CaleeShoppingView.prototype, "budget", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_quickAddText", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_selectedCategory", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_completedOpen", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_collapsedSections", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_showCustomCategoryInput", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_customCategoryText", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_showPresetForm", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_presetFormCategory", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_presetFormTitle", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_presetFormEmoji", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_confirmDeletePresetId", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_pendingRenderLimit", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_toastMessage", 2);
__decorateClass$b([
  r()
], CaleeShoppingView.prototype, "_confirmSwipeDeleteId", 2);
__decorateClass$b([
  e("#quick-add-input")
], CaleeShoppingView.prototype, "_inputEl", 2);
CaleeShoppingView = __decorateClass$b([
  t("calee-shopping-view")
], CaleeShoppingView);
var __defProp$a = Object.defineProperty;
var __getOwnPropDesc$a = Object.getOwnPropertyDescriptor;
var __decorateClass$a = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$a(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$a(target, key, result);
  return result;
};
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(void 0, {
    hour: "numeric",
    minute: "2-digit"
  });
}
function formatDuration(ms) {
  if (ms <= 0) return "0m";
  const totalMin = Math.round(ms / 6e4);
  const h2 = Math.floor(totalMin / 60);
  const m2 = totalMin % 60;
  if (h2 === 0) return `${m2}m`;
  if (m2 === 0) return `${h2}h`;
  return `${h2}h ${m2}m`;
}
let CaleeShiftProgress = class extends i {
  constructor() {
    super(...arguments);
    this.currentShift = null;
    this._pct = 0;
    this._elapsed = "";
    this._remaining = "";
    this._timer = null;
  }
  /* ── Lifecycle ──────────────────────────────────────────────────── */
  connectedCallback() {
    super.connectedCallback();
    this._tick();
    this._timer = setInterval(() => this._tick(), 15e3);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._timer) clearInterval(this._timer);
  }
  willUpdate(changed) {
    if (changed.has("currentShift")) {
      this._tick();
    }
  }
  _tick() {
    const shift = this.currentShift;
    if (!shift) {
      this._pct = 0;
      this._elapsed = "";
      this._remaining = "";
      return;
    }
    const now = Date.now();
    const start = new Date(shift.start).getTime();
    const end = new Date(shift.end).getTime();
    const total = end - start;
    if (total <= 0) {
      this._pct = 100;
      this._elapsed = formatDuration(0);
      this._remaining = formatDuration(0);
      return;
    }
    const elapsed = Math.max(0, Math.min(now - start, total));
    this._pct = Math.round(elapsed / total * 100);
    this._elapsed = formatDuration(elapsed);
    this._remaining = formatDuration(Math.max(0, total - elapsed));
  }
  /* ── Render ─────────────────────────────────────────────────────── */
  render() {
    if (!this.currentShift) {
      return b`<div class="empty">No active shift</div>`;
    }
    const shift = this.currentShift;
    return b`
      <div class="header">
        <span class="title">${shift.title}</span>
        <span class="time-range">
          ${formatTime(shift.start)} &ndash; ${formatTime(shift.end)}
        </span>
      </div>

      <div class="bar-bg">
        <div class="bar-fill" style="width:${this._pct}%"></div>
      </div>

      <div class="stats">
        <span>${this._elapsed} elapsed</span>
        <span class="pct">${this._pct}%</span>
        <span>${this._remaining} remaining</span>
      </div>
    `;
  }
};
CaleeShiftProgress.styles = i$3`
    :host {
      display: block;
      padding: 16px;
      background: var(--card-background-color, #fff);
      border-radius: 12px;
      box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.1));
    }

    .empty {
      text-align: center;
      padding: 24px 16px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 12px;
    }

    .title {
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-right: 8px;
    }

    .time-range {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      white-space: nowrap;
    }

    /* ── Progress bar ────────────────────────────────────────────── */

    .bar-bg {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: var(--divider-color, #e0e0e0);
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 4px;
      background: var(--primary-color, #03a9f4);
      transition: width 0.5s ease;
    }

    /* ── Stats ───────────────────────────────────────────────────── */

    .stats {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
    }

    .pct {
      font-weight: 600;
      color: var(--primary-color, #03a9f4);
    }
  `;
__decorateClass$a([
  n2({ type: Object })
], CaleeShiftProgress.prototype, "currentShift", 2);
__decorateClass$a([
  r()
], CaleeShiftProgress.prototype, "_pct", 2);
__decorateClass$a([
  r()
], CaleeShiftProgress.prototype, "_elapsed", 2);
__decorateClass$a([
  r()
], CaleeShiftProgress.prototype, "_remaining", 2);
CaleeShiftProgress = __decorateClass$a([
  t("calee-shift-progress")
], CaleeShiftProgress);
var __defProp$9 = Object.defineProperty;
var __getOwnPropDesc$9 = Object.getOwnPropertyDescriptor;
var __decorateClass$9 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$9(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$9(target, key, result);
  return result;
};
function formatStartTime(iso) {
  const d2 = new Date(iso);
  const now = /* @__PURE__ */ new Date();
  const isToday2 = d2.getFullYear() === now.getFullYear() && d2.getMonth() === now.getMonth() && d2.getDate() === now.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d2.getFullYear() === tomorrow.getFullYear() && d2.getMonth() === tomorrow.getMonth() && d2.getDate() === tomorrow.getDate();
  const time = d2.toLocaleTimeString(void 0, {
    hour: "numeric",
    minute: "2-digit"
  });
  if (isToday2) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return `${d2.toLocaleDateString(void 0, { weekday: "short", month: "short", day: "numeric" })} at ${time}`;
}
function formatCountdown(ms) {
  if (ms <= 0) return "now";
  const totalMin = Math.floor(ms / 6e4);
  const d2 = Math.floor(totalMin / (60 * 24));
  const h2 = Math.floor(totalMin % (60 * 24) / 60);
  const m2 = totalMin % 60;
  const parts = [];
  if (d2 > 0) parts.push(`${d2}d`);
  if (h2 > 0) parts.push(`${h2}h`);
  if (m2 > 0 || parts.length === 0) parts.push(`${m2}m`);
  return `in ${parts.join(" ")}`;
}
let CaleeNextShift = class extends i {
  constructor() {
    super(...arguments);
    this.nextShift = null;
    this._countdown = "";
    this._timer = null;
  }
  /* ── Lifecycle ──────────────────────────────────────────────────── */
  connectedCallback() {
    super.connectedCallback();
    this._tick();
    this._timer = setInterval(() => this._tick(), 15e3);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._timer) clearInterval(this._timer);
  }
  willUpdate(changed) {
    if (changed.has("nextShift")) {
      this._tick();
    }
  }
  _tick() {
    if (!this.nextShift) {
      this._countdown = "";
      return;
    }
    const ms = new Date(this.nextShift.start).getTime() - Date.now();
    this._countdown = formatCountdown(ms);
  }
  /* ── Render ─────────────────────────────────────────────────────── */
  render() {
    if (!this.nextShift) {
      return b`<div class="empty">No upcoming shifts</div>`;
    }
    const shift = this.nextShift;
    return b`
      <div class="label">Next Shift</div>
      <div class="title">${shift.title}</div>
      <div class="start-time">${formatStartTime(shift.start)}</div>
      <div class="countdown">${this._countdown}</div>
    `;
  }
};
CaleeNextShift.styles = i$3`
    :host {
      display: block;
      padding: 16px;
      background: var(--card-background-color, #fff);
      border-radius: 12px;
      box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.1));
    }

    .empty {
      text-align: center;
      padding: 24px 16px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
    }

    .label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #757575);
      margin: 0 0 8px;
    }

    .title {
      font-size: 16px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .start-time {
      font-size: 13px;
      color: var(--secondary-text-color, #757575);
      margin: 0 0 12px;
    }

    .countdown {
      font-size: 22px;
      font-weight: 700;
      color: var(--primary-color, #03a9f4);
      letter-spacing: -0.5px;
    }
  `;
__decorateClass$9([
  n2({ type: Object })
], CaleeNextShift.prototype, "nextShift", 2);
__decorateClass$9([
  r()
], CaleeNextShift.prototype, "_countdown", 2);
CaleeNextShift = __decorateClass$9([
  t("calee-next-shift")
], CaleeNextShift);
var __defProp$8 = Object.defineProperty;
var __getOwnPropDesc$8 = Object.getOwnPropertyDescriptor;
var __decorateClass$8 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$8(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$8(target, key, result);
  return result;
};
const RECURRENCE_OPTIONS = [
  { label: "None", value: "" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Fortnightly", value: "biweekly" },
  { label: "Monthly", value: "monthly" }
];
function toDateTimeLocal(iso) {
  const d2 = new Date(iso);
  const pad = (n3) => String(n3).padStart(2, "0");
  return `${d2.getFullYear()}-${pad(d2.getMonth() + 1)}-${pad(d2.getDate())}T${pad(d2.getHours())}:${pad(d2.getMinutes())}`;
}
let CaleeEventDialog = class extends i {
  constructor() {
    super(...arguments);
    this.event = null;
    this.calendars = [];
    this.open = false;
    this.defaults = {};
    this._title = "";
    this._calendarId = "";
    this._start = "";
    this._end = "";
    this._note = "";
    this._recurrenceRule = "";
    this._templateId = null;
  }
  /* ── Lifecycle ──────────────────────────────────────────────────── */
  willUpdate(changed) {
    if (changed.has("open") && this.open) {
      this._populateForm();
    }
  }
  _populateForm() {
    const ev = this.event;
    if (ev) {
      this._title = ev.title;
      this._calendarId = ev.calendar_id;
      this._start = toDateTimeLocal(ev.start);
      this._end = toDateTimeLocal(ev.end);
      this._note = ev.note;
      this._recurrenceRule = ev.recurrence_rule ?? "";
      this._templateId = ev.template_id;
    } else {
      const defs = this.defaults ?? {};
      let startDate;
      if (defs.date) {
        const timePart = defs.time ?? "";
        if (timePart) {
          startDate = /* @__PURE__ */ new Date(`${defs.date}T${timePart}`);
        } else {
          const now = /* @__PURE__ */ new Date();
          now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
          startDate = /* @__PURE__ */ new Date(`${defs.date}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
        }
      } else {
        startDate = /* @__PURE__ */ new Date();
        startDate.setMinutes(Math.ceil(startDate.getMinutes() / 30) * 30, 0, 0);
      }
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1e3);
      this._title = "";
      this._calendarId = defs.calendar_id ?? this.calendars[0]?.id ?? "";
      this._start = toDateTimeLocal(startDate.toISOString());
      this._end = toDateTimeLocal(endDate.toISOString());
      this._note = "";
      this._recurrenceRule = "";
      this._templateId = null;
    }
  }
  /* ── Events ─────────────────────────────────────────────────────── */
  _onSave() {
    if (!this._title.trim()) return;
    this.dispatchEvent(
      new CustomEvent("event-save", {
        detail: {
          id: this.event?.id ?? null,
          calendar_id: this._calendarId,
          title: this._title.trim(),
          start: new Date(this._start).toISOString(),
          end: new Date(this._end).toISOString(),
          note: this._note,
          recurrence_rule: this._recurrenceRule || null,
          template_id: this._templateId,
          version: this.event?.version ?? 0
        },
        bubbles: true,
        composed: true
      })
    );
    this._close();
  }
  _onDelete() {
    if (!this.event) return;
    this.dispatchEvent(
      new CustomEvent("event-delete", {
        detail: { eventId: this.event.id },
        bubbles: true,
        composed: true
      })
    );
    this._close();
  }
  _close() {
    this.dispatchEvent(
      new CustomEvent("dialog-close", { bubbles: true, composed: true })
    );
  }
  _onBackdropClick(e2) {
    if (e2.target.classList.contains("backdrop")) {
      this._close();
    }
  }
  _onKeydown(e2) {
    if (e2.key === "Escape") this._close();
  }
  /* ── Render ─────────────────────────────────────────────────────── */
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this._onKeydown);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._onKeydown);
  }
  render() {
    if (!this.open) return A;
    const isEdit = !!this.event;
    return b`
      <div class="backdrop" @click=${this._onBackdropClick}>
        <div class="dialog" role="dialog" aria-label="${isEdit ? "Edit" : "New"} Event">
          <h2 class="dialog-title">${isEdit ? "Edit Event" : "New Event"}</h2>

          <!-- Title -->
          <div class="field">
            <label for="evt-title">Title</label>
            <input
              id="evt-title"
              type="text"
              placeholder="Event title"
              .value=${this._title}
              @input=${(e2) => this._title = e2.target.value}
            />
          </div>

          <!-- Calendar -->
          <div class="field">
            <label for="evt-cal">Calendar</label>
            <select
              id="evt-cal"
              .value=${this._calendarId}
              @change=${(e2) => this._calendarId = e2.target.value}
            >
              ${this.calendars.map(
      (c2) => b`<option value=${c2.id} ?selected=${c2.id === this._calendarId}>
                    ${c2.name}
                  </option>`
    )}
            </select>
          </div>

          <!-- Start / End -->
          <div class="row">
            <div class="field">
              <label for="evt-start">Start</label>
              <input
                id="evt-start"
                type="datetime-local"
                .value=${this._start}
                @input=${(e2) => this._start = e2.target.value}
              />
            </div>
            <div class="field">
              <label for="evt-end">End</label>
              <input
                id="evt-end"
                type="datetime-local"
                .value=${this._end}
                @input=${(e2) => this._end = e2.target.value}
              />
            </div>
          </div>

          <!-- Note -->
          <div class="field">
            <label for="evt-note">Note</label>
            <textarea
              id="evt-note"
              placeholder="Optional note..."
              .value=${this._note}
              @input=${(e2) => this._note = e2.target.value}
            ></textarea>
          </div>

          <!-- Repeat -->
          <div class="field">
            <label>Repeat</label>
            <div class="recurrence-pills">
              ${RECURRENCE_OPTIONS.map(
      (opt) => b`
                  <button
                    type="button"
                    class="rec-pill"
                    ?active=${this._recurrenceRule === opt.value}
                    @click=${() => this._recurrenceRule = opt.value}
                  >
                    ${opt.label}
                  </button>
                `
    )}
            </div>
          </div>

          <!-- Actions -->
          <div class="actions">
            ${isEdit ? b`<button class="btn btn-delete" @click=${this._onDelete}>
                  Delete
                </button>` : A}
            <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
            <button class="btn btn-save" @click=${this._onSave}>Save</button>
          </div>
        </div>
      </div>
    `;
  }
};
CaleeEventDialog.styles = i$3`
    :host {
      display: none;
    }
    :host([open]) {
      display: block;
    }

    /* ── Backdrop ────────────────────────────────────────────────── */

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.15s ease;
      padding: 16px;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
    }

    /* ── Dialog card ─────────────────────────────────────────────── */

    .dialog {
      background: var(--card-background-color, #fff);
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 440px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
      animation: slideUp 0.2s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(24px); opacity: 0; }
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      margin: 0 0 20px;
    }

    /* ── Form ────────────────────────────────────────────────────── */

    .field {
      margin-bottom: 16px;
    }

    label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color, #757575);
      margin-bottom: 4px;
    }

    input,
    select,
    textarea {
      width: 100%;
      font-size: 14px;
      padding: 8px 12px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
      font-family: inherit;
    }
    input:focus,
    select:focus,
    textarea:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    textarea {
      min-height: 80px;
      resize: vertical;
    }

    .row {
      display: flex;
      gap: 12px;
    }
    .row .field {
      flex: 1;
    }

    /* ── Buttons ──────────────────────────────────────────────────── */

    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .btn {
      font-size: 14px;
      font-weight: 500;
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
    }
    .btn:hover {
      opacity: 0.9;
    }

    .btn-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--primary-text-color, #212121);
    }

    .btn-delete {
      background: var(--error-color, #f44336);
      color: #fff;
      margin-right: auto;
    }

    .btn-save {
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }

    /* ── Recurrence pills ────────────────────────────────────── */

    .recurrence-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 8px 0;
    }
    .rec-pill {
      padding: 4px 12px;
      border-radius: 16px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: transparent;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      color: var(--primary-text-color, #212121);
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .rec-pill[active] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 15%, transparent);
      border-color: var(--primary-color, #03a9f4);
      color: var(--primary-color, #03a9f4);
    }

    /* ── Calendar color swatch in dropdown ────────────────────── */

    .cal-option {
      padding-left: 8px;
    }

    /* ── Responsive ──────────────────────────────────────────────── */

    @media (max-width: 480px) {
      .row {
        flex-direction: column;
        gap: 0;
      }
      .dialog {
        padding: 20px 16px;
      }
    }
  `;
__decorateClass$8([
  n2({ type: Object })
], CaleeEventDialog.prototype, "event", 2);
__decorateClass$8([
  n2({ type: Array })
], CaleeEventDialog.prototype, "calendars", 2);
__decorateClass$8([
  n2({ type: Boolean, reflect: true })
], CaleeEventDialog.prototype, "open", 2);
__decorateClass$8([
  n2({ type: Object })
], CaleeEventDialog.prototype, "defaults", 2);
__decorateClass$8([
  r()
], CaleeEventDialog.prototype, "_title", 2);
__decorateClass$8([
  r()
], CaleeEventDialog.prototype, "_calendarId", 2);
__decorateClass$8([
  r()
], CaleeEventDialog.prototype, "_start", 2);
__decorateClass$8([
  r()
], CaleeEventDialog.prototype, "_end", 2);
__decorateClass$8([
  r()
], CaleeEventDialog.prototype, "_note", 2);
__decorateClass$8([
  r()
], CaleeEventDialog.prototype, "_recurrenceRule", 2);
__decorateClass$8([
  r()
], CaleeEventDialog.prototype, "_templateId", 2);
CaleeEventDialog = __decorateClass$8([
  t("calee-event-dialog")
], CaleeEventDialog);
var __defProp$7 = Object.defineProperty;
var __getOwnPropDesc$7 = Object.getOwnPropertyDescriptor;
var __decorateClass$7 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$7(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$7(target, key, result);
  return result;
};
function formatShiftTime(t2) {
  const [h2, m2] = t2.split(":").map(Number);
  const suffix = h2 >= 12 ? "pm" : "am";
  const h12 = h2 % 12 || 12;
  return m2 === 0 ? `${h12}${suffix}` : `${h12}:${String(m2).padStart(2, "0")}${suffix}`;
}
function formatTimeRange(start, end) {
  return `${formatShiftTime(start)} - ${formatShiftTime(end)}`;
}
function isOvernight(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return endMin < startMin;
}
function formatDateSubtitle(dateStr) {
  if (!dateStr) return "Select a template to create a shift";
  const d2 = /* @__PURE__ */ new Date(dateStr + "T00:00");
  return `Adding to ${d2.toLocaleDateString(void 0, {
    weekday: "long",
    day: "numeric",
    month: "short"
  })}`;
}
let CaleeTemplatePicker = class extends i {
  constructor() {
    super(...arguments);
    this.templates = [];
    this.selectedDate = "";
    this.selectedTime = "";
    this.open = false;
    this._step = "choose";
    this._datePill = "today";
    this._onKeydown = (e2) => {
      if (e2.key === "Escape") this._close();
    };
  }
  /* ── Lifecycle ──────────────────────────────────────────────────── */
  willUpdate(changed) {
    if (changed.has("open") && this.open) {
      this._step = "choose";
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const tom = /* @__PURE__ */ new Date();
      tom.setDate(tom.getDate() + 1);
      const tomorrowStr = tom.toISOString().slice(0, 10);
      if (this.selectedDate === today) {
        this._datePill = "today";
      } else if (this.selectedDate === tomorrowStr) {
        this._datePill = "tomorrow";
      } else {
        this._datePill = "custom";
      }
    }
  }
  /* ── Events ─────────────────────────────────────────────────────── */
  _select(template) {
    this.dispatchEvent(
      new CustomEvent("template-select", {
        detail: { templateId: template.id, date: this.selectedDate },
        bubbles: true,
        composed: true
      })
    );
    this._close();
  }
  _customEvent() {
    this.dispatchEvent(
      new CustomEvent("custom-event", {
        detail: {
          date: this.selectedDate,
          time: this.selectedTime || void 0
        },
        bubbles: true,
        composed: true
      })
    );
  }
  _quickAddTask() {
    this.dispatchEvent(
      new CustomEvent("quick-add-task", {
        detail: { date: this.selectedDate },
        bubbles: true,
        composed: true
      })
    );
    this._close();
  }
  _quickAddShopping() {
    this.dispatchEvent(
      new CustomEvent("quick-add-shopping", {
        detail: { date: this.selectedDate },
        bubbles: true,
        composed: true
      })
    );
    this._close();
  }
  _manageTemplates() {
    this.dispatchEvent(
      new CustomEvent("manage-templates", {
        bubbles: true,
        composed: true
      })
    );
  }
  _close() {
    this._step = "choose";
    this.dispatchEvent(
      new CustomEvent("dialog-close", { bubbles: true, composed: true })
    );
  }
  _onBackdropClick(e2) {
    if (e2.target.classList.contains("backdrop")) {
      this._close();
    }
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this._onKeydown);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._onKeydown);
  }
  /* ── Render ─────────────────────────────────────────────────────── */
  render() {
    if (!this.open) return A;
    return b`
      <div class="backdrop" @click=${this._onBackdropClick}>
        <div class="sheet" role="dialog" aria-label="Pick a shift template">
          <div class="sheet-handle"></div>
          ${this._step === "choose" ? this._renderChooseStep() : this._renderShiftsStep()}
        </div>
      </div>
    `;
  }
  _onPillClick(pill) {
    this._datePill = pill;
    const today = /* @__PURE__ */ new Date();
    if (pill === "today") {
      this.selectedDate = today.toISOString().slice(0, 10);
    } else if (pill === "tomorrow") {
      const tom = new Date(today);
      tom.setDate(tom.getDate() + 1);
      this.selectedDate = tom.toISOString().slice(0, 10);
    }
  }
  _onCustomDateChange(e2) {
    const val = e2.target.value;
    if (val) {
      this.selectedDate = val;
    }
  }
  _renderChooseStep() {
    return b`
      <h3 class="sheet-title">${formatDateSubtitle(this.selectedDate)}</h3>

      <div class="date-pills">
        <button
          class="date-pill"
          ?active=${this._datePill === "today"}
          @click=${() => this._onPillClick("today")}
        >Today</button>
        <button
          class="date-pill"
          ?active=${this._datePill === "tomorrow"}
          @click=${() => this._onPillClick("tomorrow")}
        >Tomorrow</button>
        <button
          class="date-pill"
          ?active=${this._datePill === "custom"}
          @click=${() => this._onPillClick("custom")}
        >Custom &#x25BE;</button>
      </div>

      ${this._datePill === "custom" ? b`
        <div class="custom-date-input">
          <input
            type="date"
            .value=${this.selectedDate}
            @change=${this._onCustomDateChange}
          />
        </div>
      ` : A}

      <p class="sheet-subtitle">What would you like to add?</p>

      <div class="choose-grid">
        <div class="choose-card" @click=${this._goToShifts}>
          <span class="choose-emoji">\u{1F3E5}</span>
          <span class="choose-label">Shift</span>
        </div>
        <div class="choose-card" @click=${this._customEvent}>
          <span class="choose-emoji">\u{1F4C5}</span>
          <span class="choose-label">Event</span>
        </div>
        <div class="choose-card" @click=${this._quickAddTask}>
          <span class="choose-emoji">\u{2705}</span>
          <span class="choose-label">Task</span>
        </div>
        <div class="choose-card" @click=${this._quickAddShopping}>
          <span class="choose-emoji">\u{1F6D2}</span>
          <span class="choose-label">Shop</span>
        </div>
      </div>

      <button class="cancel-btn" @click=${this._close}>Cancel</button>
    `;
  }
  _goToShifts() {
    this._step = "shifts";
  }
  _goBack() {
    this._step = "choose";
  }
  _renderShiftsStep() {
    return b`
      <div class="back-row">
        <button class="back-btn" @click=${this._goBack} aria-label="Back">&lsaquo;</button>
        <h3 class="sheet-title" style="margin:0">Shift Templates</h3>
      </div>
      <p class="sheet-subtitle">${formatDateSubtitle(this.selectedDate)}</p>

      <div class="grid">
        ${this.templates.length === 0 ? b`
              <div class="empty">
                No templates configured
                <div class="empty-sub">Add templates to quickly create shifts</div>
              </div>
            ` : this.templates.map((t2) => this._renderCard(t2))}
      </div>

      <hr class="divider" />

      <button class="manage-btn" @click=${this._manageTemplates}>
        Manage templates
      </button>

      <button class="cancel-btn" @click=${this._close}>Cancel</button>
    `;
  }
  _renderCard(t2) {
    const overnight = isOvernight(t2.start_time, t2.end_time);
    return b`
      <div class="card" @click=${() => this._select(t2)}>
        <!-- Desktop layout -->
        <div class="card-header">
          ${t2.emoji ? b`<span class="card-emoji">${t2.emoji}</span>` : A}
          <span class="card-name">${t2.name}</span>
          <span class="card-dot" style="background:${t2.color}"></span>
        </div>
        <div class="card-time">
          ${formatTimeRange(t2.start_time, t2.end_time)}
          ${overnight ? b`<span class="overnight-badge">Overnight</span>` : A}
        </div>

        <!-- Mobile layout -->
        <div class="card-mobile-icon" style="background:${t2.color}">
          ${t2.emoji ? b`<span class="card-mobile-emoji">${t2.emoji}</span>` : b`<span class="inner-dot"></span>`}
        </div>
        <div class="card-mobile-body">
          <span class="card-mobile-name">${t2.name}</span>
          <div class="card-time">
            ${formatTimeRange(t2.start_time, t2.end_time)}
            ${overnight ? b`<span class="overnight-badge">Overnight</span>` : A}
          </div>
        </div>
      </div>
    `;
  }
};
CaleeTemplatePicker.styles = i$3`
    :host {
      display: none;
    }
    :host([open]) {
      display: block;
    }

    /* ── Backdrop ────────────────────────────────────────────────── */

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
    }

    /* ── Sheet — bottom-sheet on mobile, centered card on desktop ── */

    .sheet {
      background: var(--card-background-color, #fff);
      border-radius: 16px 16px 0 0;
      padding: 24px;
      width: 100%;
      max-width: 480px;
      max-height: 75vh;
      overflow-y: auto;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.25s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(40px); opacity: 0; }
    }

    /* Handle indicator at top of sheet */
    .sheet-handle {
      width: 36px;
      height: 4px;
      background: var(--divider-color, #e0e0e0);
      border-radius: 2px;
      margin: 0 auto 16px;
    }

    .sheet-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      margin: 0 0 4px;
    }

    .sheet-subtitle {
      font-size: 13px;
      color: var(--secondary-text-color, #757575);
      margin: 0 0 20px;
    }

    /* ── Date pills in choose step ──────────────────────────── */

    .date-pills {
      display: flex;
      gap: 8px;
      margin: 8px 0 16px;
    }

    .date-pill {
      padding: 6px 16px;
      border-radius: 20px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: transparent;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      color: var(--primary-text-color, #212121);
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .date-pill:hover {
      border-color: var(--primary-color, #03a9f4);
    }

    .date-pill[active] {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: var(--primary-color, #03a9f4);
    }

    .custom-date-input {
      margin-top: -8px;
      margin-bottom: 8px;
    }

    .custom-date-input input {
      font-size: 13px;
      padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      font-family: inherit;
      transition: border-color 0.15s;
    }

    .custom-date-input input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    /* ── Desktop grid ────────────────────────────────────────────── */

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }

    /* ── Template card ───────────────────────────────────────────── */

    .card {
      position: relative;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: box-shadow 0.15s, border-color 0.15s, transform 0.1s;
      background: var(--card-background-color, #fff);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .card:hover {
      border-color: var(--primary-color, #03a9f4);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }
    .card:active {
      transform: scale(0.98);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .card-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      line-height: 1.3;
    }

    .card-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 3px;
    }

    .card-time {
      font-size: 13px;
      color: var(--secondary-text-color, #757575);
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .overnight-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      background: #fff3e0;
      color: #e65100;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.2px;
    }

    /* ── Divider ─────────────────────────────────────────────────── */

    .divider {
      border: none;
      border-top: 1px solid var(--divider-color, #e0e0e0);
      margin: 20px 0 16px;
    }

    /* ── Custom event link ───────────────────────────────────────── */

    .custom-event-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 12px 4px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-color, #03a9f4);
      font-family: inherit;
      transition: background 0.15s;
    }
    .custom-event-btn:hover {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
    }

    .custom-event-btn .plus-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 12%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 400;
      flex-shrink: 0;
    }

    /* ── Manage templates link ───────────────────────────────────── */

    .manage-btn {
      display: block;
      width: 100%;
      padding: 10px 4px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--secondary-text-color, #757575);
      font-family: inherit;
      text-align: left;
      transition: background 0.15s, color 0.15s;
    }
    .manage-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    /* ── Cancel button ───────────────────────────────────────────── */

    .cancel-btn {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 8px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--secondary-text-color, #757575);
      font-family: inherit;
      text-align: center;
      transition: background 0.15s;
    }
    .cancel-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    /* ── Empty state ─────────────────────────────────────────────── */

    .empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
    }

    .empty-sub {
      font-size: 12px;
      margin-top: 6px;
      color: var(--disabled-text-color, #aaa);
    }

    /* ── Choose step (Shift / Event / Task / Shop) ───────────── */

    .choose-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .choose-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 22px 16px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 14px;
      cursor: pointer;
      background: var(--card-background-color, #fff);
      transition: box-shadow 0.15s, border-color 0.15s, transform 0.1s;
    }
    .choose-card:hover {
      border-color: var(--primary-color, #03a9f4);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }
    .choose-card:active {
      transform: scale(0.97);
    }

    .choose-emoji {
      font-size: 32px;
      line-height: 1;
    }

    .choose-label {
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
    }

    /* ── Back arrow for shifts step ──────────────────────────── */

    .back-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .back-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 18px;
      line-height: 1;
      color: var(--secondary-text-color, #757575);
      transition: background 0.15s, color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .back-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    /* ── Card emoji ──────────────────────────────────────────── */

    .card-emoji {
      font-size: 22px;
      line-height: 1;
      flex-shrink: 0;
    }

    .card-mobile-emoji {
      font-size: 20px;
      line-height: 1;
    }

    /* ── Mobile list layout ──────────────────────────────────────── */

    @media (max-width: 600px) {
      .sheet {
        max-width: 100%;
        border-radius: 16px 16px 0 0;
        padding: 16px 20px 20px;
        max-height: 80vh;
      }

      .grid {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .card {
        flex-direction: row;
        align-items: center;
        border: none;
        border-radius: 0;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        padding: 14px 4px;
        gap: 12px;
      }
      .card:last-child {
        border-bottom: none;
      }
      .card:hover {
        box-shadow: none;
        border-color: var(--divider-color, #e0e0e0);
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      }
      .card:last-child:hover {
        border-bottom: none;
      }

      .card-mobile-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .card-mobile-icon .inner-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
      }

      .card-header {
        display: none;
      }

      .card-mobile-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
      }

      .card-mobile-name {
        font-size: 15px;
        font-weight: 500;
        color: var(--primary-text-color, #212121);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .card-time {
        font-size: 12px;
      }
    }

    /* ── Desktop: hide mobile elements ───────────────────────────── */

    @media (min-width: 601px) {
      .sheet-handle {
        display: none;
      }

      .sheet {
        border-radius: 16px;
        align-self: center;
        margin-bottom: 0;
      }

      .backdrop {
        align-items: center;
      }

      .card-mobile-icon,
      .card-mobile-body {
        display: none;
      }
    }
  `;
__decorateClass$7([
  n2({ type: Array })
], CaleeTemplatePicker.prototype, "templates", 2);
__decorateClass$7([
  n2({ type: String })
], CaleeTemplatePicker.prototype, "selectedDate", 2);
__decorateClass$7([
  n2({ type: String })
], CaleeTemplatePicker.prototype, "selectedTime", 2);
__decorateClass$7([
  n2({ type: Boolean, reflect: true })
], CaleeTemplatePicker.prototype, "open", 2);
__decorateClass$7([
  r()
], CaleeTemplatePicker.prototype, "_step", 2);
__decorateClass$7([
  r()
], CaleeTemplatePicker.prototype, "_datePill", 2);
CaleeTemplatePicker = __decorateClass$7([
  t("calee-template-picker")
], CaleeTemplatePicker);
var __defProp$6 = Object.defineProperty;
var __getOwnPropDesc$6 = Object.getOwnPropertyDescriptor;
var __decorateClass$6 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$6(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$6(target, key, result);
  return result;
};
const PRESET_COLORS = [
  "#e57373",
  "#f06292",
  "#ce93d8",
  "#9575cd",
  "#7986cb",
  "#64b5f6",
  "#4fc3f7",
  "#4dd0e1",
  "#4db6ac",
  "#81c784",
  "#aed581",
  "#dce775",
  "#fff176",
  "#ffd54f",
  "#ffb74d",
  "#ff8a65",
  "#a1887f",
  "#90a4ae",
  "#1565c0",
  "#ff9800"
];
let CaleeTemplateManager = class extends i {
  constructor() {
    super(...arguments);
    this.templates = [];
    this.calendars = [];
    this.open = false;
    this._editingTemplate = null;
    this._isNew = false;
    this._confirmDeleteId = null;
    this._saving = false;
    this._onKeydown = (e2) => {
      if (e2.key === "Escape") {
        if (this._editingTemplate) {
          this._editingTemplate = null;
          this._isNew = false;
        } else {
          this._close();
        }
      }
    };
  }
  /* ── Actions ────────────────────────────────────────────────────── */
  _close() {
    this._editingTemplate = null;
    this._isNew = false;
    this._confirmDeleteId = null;
    this.dispatchEvent(
      new CustomEvent("dialog-close", { bubbles: true, composed: true })
    );
  }
  _onBackdropClick(e2) {
    if (e2.target.classList.contains("backdrop")) {
      this._close();
    }
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this._onKeydown);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._onKeydown);
  }
  /* ── Edit/Add/Delete ────────────────────────────────────────────── */
  _startAdd() {
    const defaultCal = this.calendars.length > 0 ? this.calendars[0].id : "";
    this._editingTemplate = {
      name: "",
      calendar_id: defaultCal,
      start_time: "09:00",
      end_time: "17:00",
      color: PRESET_COLORS[0],
      emoji: ""
    };
    this._isNew = true;
    this._confirmDeleteId = null;
  }
  _startEdit(template) {
    this._editingTemplate = { ...template };
    this._isNew = false;
    this._confirmDeleteId = null;
  }
  _cancelEdit() {
    this._editingTemplate = null;
    this._isNew = false;
  }
  _confirmDelete(id) {
    this._confirmDeleteId = id;
  }
  _cancelDelete() {
    this._confirmDeleteId = null;
  }
  async _doDelete(id) {
    if (!this.hass) return;
    try {
      await this.hass.callWS({
        type: "calee/delete_template",
        template_id: id
      });
      this.dispatchEvent(
        new CustomEvent("template-deleted", {
          detail: { templateId: id },
          bubbles: true,
          composed: true
        })
      );
    } catch (err) {
      console.error("Failed to delete template:", err);
    }
    this._confirmDeleteId = null;
  }
  async _saveTemplate() {
    if (!this.hass || !this._editingTemplate) return;
    const tpl = this._editingTemplate;
    if (!tpl.name || !tpl.start_time || !tpl.end_time) return;
    this._saving = true;
    try {
      if (this._isNew) {
        const created = await this.hass.callWS({
          type: "calee/create_template",
          name: tpl.name,
          calendar_id: tpl.calendar_id || "",
          start_time: tpl.start_time,
          end_time: tpl.end_time,
          color: tpl.color || PRESET_COLORS[0],
          emoji: tpl.emoji || ""
        });
        this.dispatchEvent(
          new CustomEvent("template-created", {
            detail: { template: created },
            bubbles: true,
            composed: true
          })
        );
      } else if (tpl.id) {
        const updated = await this.hass.callWS({
          type: "calee/update_template",
          template_id: tpl.id,
          name: tpl.name,
          calendar_id: tpl.calendar_id || "",
          start_time: tpl.start_time,
          end_time: tpl.end_time,
          color: tpl.color || PRESET_COLORS[0],
          emoji: tpl.emoji || ""
        });
        this.dispatchEvent(
          new CustomEvent("template-created", {
            detail: { template: updated },
            bubbles: true,
            composed: true
          })
        );
      }
    } catch (err) {
      console.error("Failed to save template:", err);
    }
    this._saving = false;
    this._editingTemplate = null;
    this._isNew = false;
  }
  _updateField(field, value) {
    if (!this._editingTemplate) return;
    this._editingTemplate = { ...this._editingTemplate, [field]: value };
  }
  /* ── Render ─────────────────────────────────────────────────────── */
  render() {
    if (!this.open) return A;
    return b`
      <div class="backdrop" @click=${this._onBackdropClick}>
        <div class="dialog" @click=${(e2) => e2.stopPropagation()}>
          <h3 class="dialog-title">Manage Templates</h3>
          <p class="dialog-subtitle">Add, edit, or remove shift templates</p>

          ${this.templates.length === 0 && !this._editingTemplate ? b`<div class="empty">No templates yet</div>` : b`
                <div class="template-list">
                  ${this.templates.map((t2) => this._renderTemplateRow(t2))}
                </div>
              `}

          ${!this._editingTemplate ? b`
                <button class="add-btn" @click=${this._startAdd}>
                  + Add template
                </button>
              ` : A}

          ${this._editingTemplate ? this._renderEditForm() : A}

          <button class="close-btn" @click=${this._close}>Close</button>
        </div>
      </div>
    `;
  }
  _renderTemplateRow(t2) {
    const overnight = isOvernight(t2.start_time, t2.end_time);
    const isDeleting = this._confirmDeleteId === t2.id;
    return b`
      <div>
        <div class="template-row">
          <span class="tpl-color-dot" style="background:${t2.color}"></span>
          <div class="tpl-info">
            <div class="tpl-name">${t2.emoji ? b`${t2.emoji} ` : A}${t2.name}</div>
            <div class="tpl-time">
              ${formatTimeRange(t2.start_time, t2.end_time)}
              ${overnight ? b`<span class="overnight-badge">Overnight</span>` : A}
            </div>
          </div>
          <div class="tpl-actions">
            <button
              class="icon-btn"
              title="Edit template"
              @click=${() => this._startEdit(t2)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button
              class="icon-btn danger"
              title="Delete template"
              @click=${() => this._confirmDelete(t2.id)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        ${isDeleting ? b`
              <div class="confirm-delete">
                <span>Delete "${t2.name}"?</span>
                <button class="confirm-delete-btn confirm-no" @click=${this._cancelDelete}>Cancel</button>
                <button class="confirm-delete-btn confirm-yes" @click=${() => this._doDelete(t2.id)}>Delete</button>
              </div>
            ` : A}
      </div>
    `;
  }
  _renderEditForm() {
    const tpl = this._editingTemplate;
    return b`
      <div class="edit-form">
        <h4 class="edit-form-title">${this._isNew ? "New Template" : "Edit Template"}</h4>

        <div class="form-field">
          <span class="form-label">Name</span>
          <input
            class="form-input"
            type="text"
            .value=${tpl.name ?? ""}
            @input=${(e2) => this._updateField("name", e2.target.value)}
            placeholder="e.g. Early Shift"
            autofocus
          />
        </div>

        <div class="form-field">
          <span class="form-label">Emoji</span>
          <input
            class="form-input"
            type="text"
            .value=${tpl.emoji ?? ""}
            @input=${(e2) => this._updateField("emoji", e2.target.value)}
            placeholder="e.g. \u2600\ufe0f"
            style="max-width: 80px;"
          />
        </div>

        <div class="form-field">
          <span class="form-label">Calendar</span>
          <select
            class="form-input"
            .value=${tpl.calendar_id ?? ""}
            @change=${(e2) => this._updateField("calendar_id", e2.target.value)}
          >
            ${this.calendars.map(
      (c2) => b`
                <option value=${c2.id} ?selected=${c2.id === tpl.calendar_id}>
                  ${c2.name}
                </option>
              `
    )}
          </select>
        </div>

        <div class="form-row">
          <div class="form-field">
            <span class="form-label">Start time</span>
            <input
              class="form-input"
              type="time"
              .value=${tpl.start_time ?? "09:00"}
              @input=${(e2) => this._updateField("start_time", e2.target.value)}
            />
          </div>
          <div class="form-field">
            <span class="form-label">End time</span>
            <input
              class="form-input"
              type="time"
              .value=${tpl.end_time ?? "17:00"}
              @input=${(e2) => this._updateField("end_time", e2.target.value)}
            />
          </div>
        </div>

        <div class="form-field">
          <span class="form-label">Color</span>
          <div class="color-grid">
            ${PRESET_COLORS.map(
      (c2) => b`
                <button
                  class="color-swatch ${c2 === tpl.color ? "selected" : ""}"
                  @click=${() => this._updateField("color", c2)}
                  title=${c2}
                >
                  <div class="color-inner" style="background:${c2}"></div>
                </button>
              `
    )}
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-secondary" @click=${this._cancelEdit}>Cancel</button>
          <button
            class="btn btn-primary"
            ?disabled=${this._saving || !tpl.name}
            @click=${this._saveTemplate}
          >
            ${this._saving ? "Saving..." : this._isNew ? "Add" : "Save"}
          </button>
        </div>
      </div>
    `;
  }
};
CaleeTemplateManager.styles = i$3`
    :host {
      display: none;
    }
    :host([open]) {
      display: block;
    }

    /* ── Backdrop ────────────────────────────────────────────────── */

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 101;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
    }

    /* ── Dialog card ─────────────────────────────────────────────── */

    .dialog {
      background: var(--card-background-color, #fff);
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 520px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      animation: scaleIn 0.2s ease;
    }
    @keyframes scaleIn {
      from { transform: scale(0.96); opacity: 0; }
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      margin: 0 0 4px;
    }

    .dialog-subtitle {
      font-size: 13px;
      color: var(--secondary-text-color, #757575);
      margin: 0 0 20px;
    }

    /* ── Template list ───────────────────────────────────────────── */

    .template-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .template-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 8px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      transition: background 0.15s;
    }
    .template-row:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
    }
    .template-row:last-child {
      border-bottom: none;
    }

    .tpl-color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .tpl-info {
      flex: 1;
      min-width: 0;
    }

    .tpl-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
    }

    .tpl-time {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .overnight-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 600;
      background: #fff3e0;
      color: #e65100;
      padding: 1px 5px;
      border-radius: 3px;
    }

    .tpl-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }

    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
      line-height: 1;
      transition: background 0.15s, color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
    }
    .icon-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
      color: var(--primary-text-color, #212121);
    }
    .icon-btn.danger:hover {
      background: color-mix(in srgb, var(--error-color, #f44336) 10%, transparent);
      color: var(--error-color, #f44336);
    }

    /* ── Delete confirmation ──────────────────────────────────────── */

    .confirm-delete {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: color-mix(in srgb, var(--error-color, #f44336) 6%, transparent);
      border-radius: 8px;
      margin-top: 4px;
    }

    .confirm-delete span {
      font-size: 13px;
      color: var(--primary-text-color, #212121);
      flex: 1;
    }

    .confirm-delete-btn {
      padding: 5px 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      transition: opacity 0.15s;
    }
    .confirm-yes {
      background: var(--error-color, #f44336);
      color: #fff;
    }
    .confirm-yes:hover {
      opacity: 0.9;
    }
    .confirm-no {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
      color: var(--primary-text-color, #212121);
    }

    /* ── Add button ──────────────────────────────────────────────── */

    .add-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 12px 8px;
      margin-top: 4px;
      background: none;
      border: none;
      border-top: 1px solid var(--divider-color, #e0e0e0);
      cursor: pointer;
      border-radius: 0 0 8px 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-color, #03a9f4);
      font-family: inherit;
      transition: background 0.15s;
    }
    .add-btn:hover {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
    }

    /* ── Edit form ───────────────────────────────────────────────── */

    .edit-form {
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 12px;
      padding: 20px;
      margin-top: 16px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
    }

    .edit-form-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      margin: 0 0 16px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 14px;
    }

    .form-field:last-of-type {
      margin-bottom: 0;
    }

    .form-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color, #757575);
      letter-spacing: 0.2px;
    }

    .form-input {
      padding: 10px 12px;
      border: 2px solid transparent;
      border-radius: 8px;
      font-size: 14px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font-family: inherit;
      transition: border-color 0.15s;
      outline: none;
    }
    .form-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .form-row .form-field {
      flex: 1;
    }

    /* ── Color picker ────────────────────────────────────────────── */

    .color-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .color-swatch {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color 0.15s, transform 0.1s;
      padding: 0;
      background: none;
    }
    .color-swatch:hover {
      transform: scale(1.15);
    }
    .color-swatch.selected {
      border-color: var(--primary-text-color, #212121);
      transform: scale(1.15);
    }

    .color-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }

    /* ── Form actions ────────────────────────────────────────────── */

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 18px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      transition: opacity 0.15s, background 0.15s;
    }

    .btn-secondary {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
      color: var(--primary-text-color, #212121);
    }
    .btn-secondary:hover {
      background: var(--divider-color, #e0e0e0);
    }

    .btn-primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }
    .btn-primary:hover {
      opacity: 0.9;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ── Close button ────────────────────────────────────────────── */

    .close-btn {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 16px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--secondary-text-color, #757575);
      font-family: inherit;
      text-align: center;
      transition: background 0.15s;
    }
    .close-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    /* ── Empty state ─────────────────────────────────────────────── */

    .empty {
      text-align: center;
      padding: 24px 16px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
    }

    /* ── Mobile adjustments ──────────────────────────────────────── */

    @media (max-width: 600px) {
      .backdrop {
        align-items: flex-end;
        padding: 0;
      }

      .dialog {
        border-radius: 16px 16px 0 0;
        max-width: 100%;
        max-height: 85vh;
        padding: 20px;
      }

      .form-row {
        flex-direction: column;
        gap: 0;
      }
    }
  `;
__decorateClass$6([
  n2({ type: Array })
], CaleeTemplateManager.prototype, "templates", 2);
__decorateClass$6([
  n2({ type: Array })
], CaleeTemplateManager.prototype, "calendars", 2);
__decorateClass$6([
  n2({ attribute: false })
], CaleeTemplateManager.prototype, "hass", 2);
__decorateClass$6([
  n2({ type: Boolean, reflect: true })
], CaleeTemplateManager.prototype, "open", 2);
__decorateClass$6([
  r()
], CaleeTemplateManager.prototype, "_editingTemplate", 2);
__decorateClass$6([
  r()
], CaleeTemplateManager.prototype, "_isNew", 2);
__decorateClass$6([
  r()
], CaleeTemplateManager.prototype, "_confirmDeleteId", 2);
__decorateClass$6([
  r()
], CaleeTemplateManager.prototype, "_saving", 2);
CaleeTemplateManager = __decorateClass$6([
  t("calee-template-manager")
], CaleeTemplateManager);
var __defProp$5 = Object.defineProperty;
var __getOwnPropDesc$5 = Object.getOwnPropertyDescriptor;
var __decorateClass$5 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$5(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$5(target, key, result);
  return result;
};
let CaleeSettingsDialog = class extends i {
  constructor() {
    super(...arguments);
    this.open = false;
    this._timeFormat = "12h";
    this._weekStartsOn = "monday";
    this._maxEventAgeDays = 365;
    this._currencySymbol = "$";
    this._budgetAmount = null;
    this._customCategories = [];
    this._newCategoryText = "";
    this._saving = false;
    this._loadingSettings = false;
  }
  willUpdate(changed) {
    if (changed.has("open") && this.open) {
      this._loadCurrent();
    }
  }
  async _loadCurrent() {
    this._newCategoryText = "";
    try {
      const raw = localStorage.getItem("calee-custom-categories");
      this._customCategories = raw ? JSON.parse(raw) : [];
    } catch {
      this._customCategories = [];
    }
    if (this.hass) {
      this._loadingSettings = true;
      try {
        const result = await this.hass.callWS({ type: "calee/get_settings" });
        this._timeFormat = result.time_format ?? "12h";
        this._weekStartsOn = result.week_start ?? "monday";
        this._maxEventAgeDays = result.max_event_age_days ?? 365;
        this._currencySymbol = result.currency ?? "$";
        this._budgetAmount = result.budget > 0 ? result.budget : null;
      } catch {
        this._timeFormat = "12h";
        this._weekStartsOn = "monday";
        this._maxEventAgeDays = 365;
        this._currencySymbol = "$";
        this._budgetAmount = null;
      } finally {
        this._loadingSettings = false;
      }
    }
  }
  _close() {
    this.dispatchEvent(
      new CustomEvent("dialog-close", { bubbles: true, composed: true })
    );
  }
  _addCategory() {
    const name = this._newCategoryText.trim().toLowerCase();
    if (!name || this._customCategories.includes(name)) {
      this._newCategoryText = "";
      return;
    }
    this._customCategories = [...this._customCategories, name];
    this._newCategoryText = "";
  }
  _removeCategory(cat) {
    this._customCategories = this._customCategories.filter((c2) => c2 !== cat);
  }
  _onNewCategoryKeydown(e2) {
    if (e2.key === "Enter") {
      e2.preventDefault();
      this._addCategory();
    }
  }
  async _save() {
    this._saving = true;
    try {
      localStorage.setItem("calee-custom-categories", JSON.stringify(this._customCategories));
    } catch {
    }
    if (this.hass) {
      try {
        await this.hass.callWS({
          type: "calee/update_settings",
          max_event_age_days: this._maxEventAgeDays,
          currency: this._currencySymbol,
          budget: this._budgetAmount ?? 0,
          week_start: this._weekStartsOn,
          time_format: this._timeFormat
        });
      } catch (err) {
        console.error("[Calee] Failed to save settings:", err);
      }
    }
    const settings = {
      timeFormat: this._timeFormat,
      weekStartsOn: this._weekStartsOn,
      maxEventAgeDays: this._maxEventAgeDays,
      currencySymbol: this._currencySymbol,
      budgetAmount: this._budgetAmount,
      customCategories: this._customCategories
    };
    this.dispatchEvent(
      new CustomEvent("settings-changed", {
        detail: settings,
        bubbles: true,
        composed: true
      })
    );
    this._saving = false;
    this._close();
  }
  render() {
    if (!this.open) return A;
    return b`
      <div class="backdrop" @click=${this._close}>
        <div class="card" @click=${(e2) => e2.stopPropagation()}>
          <h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
            </svg>
            Settings
          </h2>

          <!-- Display -->
          <div class="section">
            <div class="section-title">Display</div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Time format</div>
              </div>
              <div class="toggle-group">
                <button
                  class="toggle-opt"
                  ?active=${this._timeFormat === "12h"}
                  @click=${() => {
      this._timeFormat = "12h";
    }}
                >12h</button>
                <button
                  class="toggle-opt"
                  ?active=${this._timeFormat === "24h"}
                  @click=${() => {
      this._timeFormat = "24h";
    }}
                >24h</button>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Week starts on</div>
              </div>
              <div class="toggle-group">
                <button
                  class="toggle-opt"
                  ?active=${this._weekStartsOn === "monday"}
                  @click=${() => {
      this._weekStartsOn = "monday";
    }}
                >Monday</button>
                <button
                  class="toggle-opt"
                  ?active=${this._weekStartsOn === "sunday"}
                  @click=${() => {
      this._weekStartsOn = "sunday";
    }}
                >Sunday</button>
              </div>
            </div>
          </div>

          <!-- Data -->
          <div class="section">
            <div class="section-title">Data</div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Event retention</div>
                <div class="setting-desc">Keep events for this many days</div>
              </div>
              <div class="slider-row">
                <input
                  type="range"
                  min="30"
                  max="3650"
                  step="5"
                  .value=${String(this._maxEventAgeDays)}
                  @input=${(e2) => {
      this._maxEventAgeDays = Number(e2.target.value);
    }}
                />
                <span class="slider-value">${this._maxEventAgeDays}d</span>
              </div>
            </div>

          </div>

          <!-- Budget -->
          <div class="section">
            <div class="section-title">Budget</div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Currency symbol</div>
              </div>
              <input
                type="text"
                class="setting-input currency"
                maxlength="4"
                .value=${this._currencySymbol}
                @input=${(e2) => {
      this._currencySymbol = e2.target.value || "$";
    }}
              />
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Budget amount</div>
                <div class="setting-desc">Optional monthly budget</div>
              </div>
              <input
                type="number"
                class="setting-input"
                min="0"
                step="1"
                placeholder="--"
                .value=${this._budgetAmount !== null ? String(this._budgetAmount) : ""}
                @input=${(e2) => {
      const val = e2.target.value;
      this._budgetAmount = val ? Number(val) : null;
    }}
              />
            </div>
          </div>

          <!-- Shopping Categories -->
          <div class="section">
            <div class="section-title">Shopping categories</div>

            <div class="setting-row" style="flex-direction:column;align-items:stretch;gap:8px;">
              <div class="setting-desc" style="margin:0;">
                Default: Food, Household, Health, Personal, Other. Add your own below.
              </div>

              ${this._customCategories.length > 0 ? b`
                    <div class="category-list">
                      ${this._customCategories.map(
      (cat) => b`
                          <div class="category-tag">
                            <span class="category-tag-label">${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                            <button
                              class="category-tag-remove"
                              @click=${() => this._removeCategory(cat)}
                              aria-label="Remove ${cat}"
                            >&times;</button>
                          </div>
                        `
    )}
                    </div>
                  ` : A}

              <div class="category-add-row">
                <input
                  type="text"
                  class="setting-input"
                  style="width:auto;flex:1;text-align:left;"
                  placeholder="New category..."
                  .value=${this._newCategoryText}
                  @input=${(e2) => {
      this._newCategoryText = e2.target.value;
    }}
                  @keydown=${this._onNewCategoryKeydown}
                />
                <button
                  class="btn btn-add-cat"
                  @click=${this._addCategory}
                >Add</button>
              </div>
            </div>
          </div>

          <div class="actions">
            <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
            <button class="btn btn-save" ?disabled=${this._saving} @click=${this._save}>Save</button>
          </div>
        </div>
      </div>
    `;
  }
};
CaleeSettingsDialog.styles = i$3`
    :host {
      display: none;
    }
    :host([open]) {
      display: block;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.15s ease;
      padding: 16px;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
    }

    .card {
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 16px;
      padding: 24px;
      width: 90%;
      max-width: 460px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      animation: slideUp 0.2s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(12px); opacity: 0; }
    }

    h2 {
      margin: 0 0 20px;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h2 svg {
      width: 20px;
      height: 20px;
      color: var(--secondary-text-color, #727272);
    }

    .section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--secondary-text-color, #727272);
      margin-bottom: 10px;
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--divider-color, #f0f0f0);
    }

    .setting-row:last-child {
      border-bottom: none;
    }

    .setting-label {
      font-size: 14px;
      font-weight: 400;
      color: var(--primary-text-color, #212121);
    }

    .setting-desc {
      font-size: 12px;
      color: var(--secondary-text-color, #999);
      margin-top: 2px;
    }

    /* Toggle switch */
    .toggle-group {
      display: flex;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .toggle-opt {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      background: none;
      color: var(--secondary-text-color, #727272);
      transition: background 0.15s, color 0.15s;
      font-family: inherit;
    }

    .toggle-opt[active] {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }

    /* Number / text inputs */
    .setting-input {
      width: 80px;
      padding: 6px 10px;
      border: 2px solid transparent;
      border-radius: 8px;
      font-size: 14px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
      font-family: inherit;
      transition: border-color 0.15s, background 0.15s;
      outline: none;
      text-align: right;
    }

    .setting-input:focus {
      border-color: var(--primary-color, #03a9f4);
      background: var(--card-background-color, #fff);
    }

    .setting-input.short {
      width: 60px;
    }

    .setting-input.currency {
      width: 50px;
      text-align: center;
    }

    /* Slider */
    .slider-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .slider-row input[type="range"] {
      width: 120px;
      accent-color: var(--primary-color, #03a9f4);
    }

    .slider-value {
      font-size: 13px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      min-width: 50px;
      text-align: right;
    }

    /* Category tags */
    .category-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .category-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border-radius: 16px;
      font-size: 13px;
      color: var(--primary-text-color, #212121);
    }

    .category-tag-label {
      font-weight: 500;
    }

    .category-tag-remove {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--secondary-text-color, #727272);
      font-size: 16px;
      line-height: 1;
      padding: 0 2px;
      border-radius: 50%;
      transition: color 0.15s, background 0.15s;
    }

    .category-tag-remove:hover {
      color: var(--error-color, #f44336);
      background: rgba(244, 67, 54, 0.08);
    }

    .category-add-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn-add-cat {
      padding: 6px 14px;
      border: none;
      border-radius: 8px;
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      transition: opacity 0.15s;
      flex-shrink: 0;
    }

    .btn-add-cat:hover {
      opacity: 0.9;
    }

    /* Actions */
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }

    .btn {
      padding: 8px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      transition: background 0.15s, opacity 0.15s;
    }

    .btn-cancel {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    .btn-cancel:hover {
      background: var(--divider-color, #e0e0e0);
    }

    .btn-save {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }

    .btn-save:hover {
      opacity: 0.9;
    }

    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;
__decorateClass$5([
  n2({ type: Boolean, reflect: true })
], CaleeSettingsDialog.prototype, "open", 2);
__decorateClass$5([
  n2({ attribute: false })
], CaleeSettingsDialog.prototype, "hass", 2);
__decorateClass$5([
  r()
], CaleeSettingsDialog.prototype, "_timeFormat", 2);
__decorateClass$5([
  r()
], CaleeSettingsDialog.prototype, "_weekStartsOn", 2);
__decorateClass$5([
  r()
], CaleeSettingsDialog.prototype, "_maxEventAgeDays", 2);
__decorateClass$5([
  r()
], CaleeSettingsDialog.prototype, "_currencySymbol", 2);
__decorateClass$5([
  r()
], CaleeSettingsDialog.prototype, "_budgetAmount", 2);
__decorateClass$5([
  r()
], CaleeSettingsDialog.prototype, "_customCategories", 2);
__decorateClass$5([
  r()
], CaleeSettingsDialog.prototype, "_newCategoryText", 2);
__decorateClass$5([
  r()
], CaleeSettingsDialog.prototype, "_saving", 2);
__decorateClass$5([
  r()
], CaleeSettingsDialog.prototype, "_loadingSettings", 2);
CaleeSettingsDialog = __decorateClass$5([
  t("calee-settings-dialog")
], CaleeSettingsDialog);
var __defProp$4 = Object.defineProperty;
var __getOwnPropDesc$4 = Object.getOwnPropertyDescriptor;
var __decorateClass$4 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$4(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$4(target, key, result);
  return result;
};
function relativeTime$1(isoStr) {
  const now = Date.now();
  const then = new Date(isoStr).getTime();
  const diffMs = now - then;
  if (Number.isNaN(diffMs) || diffMs < 0) return "";
  const minutes = Math.floor(diffMs / 6e4);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const d2 = new Date(isoStr);
  return d2.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
let CaleeDeletedItems = class extends i {
  constructor() {
    super(...arguments);
    this.open = false;
    this.calendars = [];
    this.lists = [];
    this._items = [];
    this._loading = false;
    this._restoringId = null;
    this._toastMessage = "";
  }
  // ── Lifecycle ────────────────────────────────────────────────────────
  updated(changedProps) {
    if (changedProps.has("open") && this.open) {
      this._loadItems();
    }
  }
  // ── Data ─────────────────────────────────────────────────────────────
  async _loadItems() {
    if (!this.hass) return;
    this._loading = true;
    try {
      const result = await this.hass.callWS({ type: "calee/deleted_items" });
      this._items = result ?? [];
    } catch {
      this._items = [];
    } finally {
      this._loading = false;
    }
  }
  async _restore(item) {
    if (!this.hass || this._restoringId) return;
    this._restoringId = item.id;
    const wsType = item.item_type === "task" ? "calee/restore_task" : "calee/restore_event";
    const idKey = item.item_type === "task" ? "task_id" : "event_id";
    try {
      await this.hass.callWS({ type: wsType, [idKey]: item.id });
      this._items = this._items.filter((i2) => i2.id !== item.id);
      this._showToast("Restored");
    } catch (err) {
      console.error("Failed to restore item:", err);
      this._showToast("Restore failed");
    } finally {
      this._restoringId = null;
    }
  }
  _showToast(msg) {
    this._toastMessage = msg;
    setTimeout(() => {
      this._toastMessage = "";
    }, 2e3);
  }
  _close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent("dialog-close"));
  }
  // ── Helpers ──────────────────────────────────────────────────────────
  _getContainerName(item) {
    if (item.item_type === "task" && item.list_id) {
      const list = this.lists.find((l2) => l2.id === item.list_id);
      return list?.name ?? "";
    }
    if (item.item_type === "event" && item.calendar_id) {
      const cal = this.calendars.find((c2) => c2.id === item.calendar_id);
      return cal?.name ?? "";
    }
    return "";
  }
  render() {
    if (!this.open) return A;
    return b`
      <div class="backdrop" @click=${this._close}>
        <div class="card" @click=${(e2) => e2.stopPropagation()}>
          <div class="card-header">Recently Deleted</div>
          <div class="card-body">
            ${this._loading ? b`<div class="loading">Loading...</div>` : this._items.length === 0 ? b`<div class="empty">No recently deleted items.</div>` : this._items.map(
      (item) => b`
                      <div class="item">
                        <div class="item-info">
                          <div class="item-title">${item.title}</div>
                          <div class="item-meta">
                            <span>${item.item_type === "task" ? "task" : "shift"}</span>
                            <span>deleted ${relativeTime$1(item.deleted_at)}</span>
                            ${this._getContainerName(item) ? b`<span>${this._getContainerName(item)}</span>` : A}
                          </div>
                        </div>
                        <button
                          class="restore-btn"
                          ?disabled=${this._restoringId === item.id}
                          @click=${() => this._restore(item)}
                        >
                          ${this._restoringId === item.id ? "..." : "Restore"}
                        </button>
                      </div>
                    `
    )}
          </div>
          <div class="card-footer">
            <div class="footer-note">
              Items are permanently removed after 30 days.
            </div>
          </div>
          <div class="card-actions">
            <button class="close-btn" @click=${this._close}>Close</button>
          </div>
        </div>
      </div>
      ${this._toastMessage ? b`<div class="toast">${this._toastMessage}</div>` : A}
    `;
  }
};
CaleeDeletedItems.styles = i$3`
    :host {
      display: none;
    }

    :host([open]) {
      display: block;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 101;
    }

    .card {
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 16px;
      width: 90%;
      max-width: 440px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    }

    .card-header {
      padding: 20px 24px 12px;
      font-size: 18px;
      font-weight: 500;
      flex-shrink: 0;
    }

    .card-body {
      flex: 1;
      overflow-y: auto;
      padding: 0 24px;
      min-height: 0;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }

    .item:last-child {
      border-bottom: none;
    }

    .item-info {
      flex: 1;
      min-width: 0;
    }

    .item-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-meta {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      margin-top: 2px;
    }

    .item-meta span + span::before {
      content: " \00b7 ";
    }

    .restore-btn {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .restore-btn:hover {
      opacity: 0.9;
    }

    .restore-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .card-footer {
      padding: 12px 24px 8px;
      flex-shrink: 0;
    }

    .footer-note {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      text-align: center;
      padding: 8px 0 4px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }

    .card-actions {
      display: flex;
      justify-content: center;
      padding: 8px 24px 20px;
      flex-shrink: 0;
    }

    .close-btn {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
      border: none;
      border-radius: 8px;
      padding: 8px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .close-btn:hover {
      background: var(--divider-color, #e0e0e0);
    }

    .empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--secondary-text-color, #727272);
      font-size: 14px;
    }

    .loading {
      text-align: center;
      padding: 32px 16px;
      color: var(--secondary-text-color, #727272);
      font-size: 14px;
    }

    .toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--primary-text-color, #212121);
      color: var(--card-background-color, #fff);
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      z-index: 200;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      animation: toast-in 0.2s ease;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    /* Mobile: bottom sheet style */
    @media (max-width: 600px) {
      .backdrop {
        align-items: flex-end;
      }

      .card {
        width: 100%;
        max-width: 100%;
        border-radius: 16px 16px 0 0;
        max-height: 85vh;
      }
    }
  `;
__decorateClass$4([
  n2({ attribute: false })
], CaleeDeletedItems.prototype, "hass", 2);
__decorateClass$4([
  n2({ type: Boolean, reflect: true })
], CaleeDeletedItems.prototype, "open", 2);
__decorateClass$4([
  n2({ attribute: false })
], CaleeDeletedItems.prototype, "calendars", 2);
__decorateClass$4([
  n2({ attribute: false })
], CaleeDeletedItems.prototype, "lists", 2);
__decorateClass$4([
  r()
], CaleeDeletedItems.prototype, "_items", 2);
__decorateClass$4([
  r()
], CaleeDeletedItems.prototype, "_loading", 2);
__decorateClass$4([
  r()
], CaleeDeletedItems.prototype, "_restoringId", 2);
__decorateClass$4([
  r()
], CaleeDeletedItems.prototype, "_toastMessage", 2);
CaleeDeletedItems = __decorateClass$4([
  t("calee-deleted-items")
], CaleeDeletedItems);
var __defProp$3 = Object.defineProperty;
var __getOwnPropDesc$3 = Object.getOwnPropertyDescriptor;
var __decorateClass$3 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$3(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$3(target, key, result);
  return result;
};
function relativeTime(isoStr) {
  const now = Date.now();
  const then = new Date(isoStr).getTime();
  const diffMs = now - then;
  if (Number.isNaN(diffMs) || diffMs < 0) return "";
  const minutes = Math.floor(diffMs / 6e4);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const d2 = new Date(isoStr);
  return d2.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function getActionInfo(action) {
  switch (action) {
    case "create":
      return { icon: "+", label: "Created", color: "var(--success-color, #4caf50)" };
    case "update":
      return { icon: "✎", label: "Updated", color: "var(--info-color, #2196f3)" };
    case "delete":
      return { icon: "✕", label: "Deleted", color: "var(--error-color, #f44336)" };
    case "restore":
      return { icon: "↺", label: "Restored", color: "var(--warning-color, #ff9800)" };
    case "complete":
      return { icon: "✓", label: "Completed", color: "var(--success-color, #4caf50)" };
    case "uncomplete":
      return { icon: "○", label: "Reopened", color: "var(--secondary-text-color, #727272)" };
    case "snooze":
      return { icon: "⏰", label: "Snoozed", color: "var(--secondary-text-color, #727272)" };
    default:
      return { icon: "•", label: action, color: "var(--secondary-text-color, #727272)" };
  }
}
let CaleeActivityFeed = class extends i {
  constructor() {
    super(...arguments);
    this.open = false;
    this._entries = [];
    this._loading = false;
  }
  // ── Lifecycle ────────────────────────────────────────────────────────
  updated(changedProps) {
    if (changedProps.has("open") && this.open) {
      this._loadEntries();
    }
  }
  // ── Data ─────────────────────────────────────────────────────────────
  async _loadEntries() {
    if (!this.hass) return;
    this._loading = true;
    try {
      const result = await this.hass.callWS({
        type: "calee/audit_log",
        limit: 50
      });
      const entries = result ?? [];
      this._entries = [...entries].reverse();
    } catch {
      this._entries = [];
    } finally {
      this._loading = false;
    }
  }
  _close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent("dialog-close"));
  }
  // ── Helpers ──────────────────────────────────────────────────────────
  _buildDescription(entry) {
    const info = getActionInfo(entry.action);
    if (entry.detail) {
      return `${info.label} "${entry.detail}"`;
    }
    const type = entry.resource_type || "item";
    return `${info.label} ${type}`;
  }
  render() {
    if (!this.open) return A;
    return b`
      <div class="backdrop" @click=${this._close}>
        <div class="card" @click=${(e2) => e2.stopPropagation()}>
          <div class="card-header">Activity</div>
          <div class="card-body">
            ${this._loading ? b`<div class="loading">Loading...</div>` : this._entries.length === 0 ? b`<div class="empty">No activity yet.</div>` : this._entries.map((entry) => {
      const info = getActionInfo(entry.action);
      return b`
                      <div class="entry">
                        <div
                          class="entry-icon"
                          style="color: ${info.color}"
                        >
                          ${info.icon}
                        </div>
                        <div class="entry-content">
                          <div class="entry-desc">
                            ${this._buildDescription(entry)}
                          </div>
                          <div class="entry-time">
                            ${relativeTime(entry.timestamp)}
                          </div>
                        </div>
                      </div>
                    `;
    })}
          </div>
          <div class="card-actions">
            <button class="close-btn" @click=${this._close}>Close</button>
          </div>
        </div>
      </div>
    `;
  }
};
CaleeActivityFeed.styles = i$3`
    :host {
      display: none;
    }

    :host([open]) {
      display: block;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 101;
    }

    .card {
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 16px;
      width: 90%;
      max-width: 440px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    }

    .card-header {
      padding: 20px 24px 12px;
      font-size: 18px;
      font-weight: 500;
      flex-shrink: 0;
    }

    .card-body {
      flex: 1;
      overflow-y: auto;
      padding: 0 24px;
      min-height: 0;
    }

    .entry {
      display: flex;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      align-items: flex-start;
    }

    .entry:last-child {
      border-bottom: none;
    }

    .entry-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      margin-top: 1px;
    }

    .entry-content {
      flex: 1;
      min-width: 0;
    }

    .entry-desc {
      font-size: 14px;
      font-weight: 400;
      color: var(--primary-text-color, #212121);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entry-time {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      margin-top: 2px;
    }

    .card-actions {
      display: flex;
      justify-content: center;
      padding: 16px 24px 20px;
      flex-shrink: 0;
    }

    .close-btn {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
      border: none;
      border-radius: 8px;
      padding: 8px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .close-btn:hover {
      background: var(--divider-color, #e0e0e0);
    }

    .empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--secondary-text-color, #727272);
      font-size: 14px;
    }

    .loading {
      text-align: center;
      padding: 32px 16px;
      color: var(--secondary-text-color, #727272);
      font-size: 14px;
    }

    /* Mobile: bottom sheet style */
    @media (max-width: 600px) {
      .backdrop {
        align-items: flex-end;
      }

      .card {
        width: 100%;
        max-width: 100%;
        border-radius: 16px 16px 0 0;
        max-height: 85vh;
      }
    }
  `;
__decorateClass$3([
  n2({ attribute: false })
], CaleeActivityFeed.prototype, "hass", 2);
__decorateClass$3([
  n2({ type: Boolean, reflect: true })
], CaleeActivityFeed.prototype, "open", 2);
__decorateClass$3([
  r()
], CaleeActivityFeed.prototype, "_entries", 2);
__decorateClass$3([
  r()
], CaleeActivityFeed.prototype, "_loading", 2);
CaleeActivityFeed = __decorateClass$3([
  t("calee-activity-feed")
], CaleeActivityFeed);
var __defProp$2 = Object.defineProperty;
var __getOwnPropDesc$2 = Object.getOwnPropertyDescriptor;
var __decorateClass$2 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$2(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$2(target, key, result);
  return result;
};
let CaleeRoutineManager = class extends i {
  constructor() {
    super(...arguments);
    this.routines = [];
    this.templates = [];
    this.open = false;
    this._editingRoutine = null;
    this._isNew = false;
    this._confirmDeleteId = null;
  }
  render() {
    if (!this.open) return A;
    return b`
      <div class="overlay" @click=${this._onOverlayClick}>
        <div class="dialog" @click=${(e2) => e2.stopPropagation()}>
          <div class="dialog-header">
            <span class="dialog-title">Routines</span>
            <button class="close-btn" @click=${this._close}>\u2715</button>
          </div>

          ${this.routines.length === 0 && !this._editingRoutine ? b`<div class="empty-msg">No routines yet. Create one to get started.</div>` : A}

          ${this.routines.map((r2) => b`
            <div class="routine-row">
              <span class="routine-emoji">${r2.emoji || "⚡"}</span>
              <div class="routine-info">
                <div class="routine-name">${r2.name}</div>
                ${r2.description ? b`<div class="routine-desc">${r2.description}</div>` : A}
              </div>
              <div class="routine-actions">
                <button class="icon-btn" @click=${() => this._editRoutine(r2)} title="Edit">\u270E</button>
                <button class="icon-btn" @click=${() => {
      this._confirmDeleteId = r2.id;
    }} title="Delete">\u2715</button>
              </div>
            </div>
          `)}

          <button class="add-btn" @click=${this._newRoutine}>+ Add routine</button>

          ${this._editingRoutine ? this._renderForm() : A}

          ${this._confirmDeleteId ? b`
            <div class="confirm-overlay" @click=${() => {
      this._confirmDeleteId = null;
    }}>
              <div class="confirm-dialog" @click=${(e2) => e2.stopPropagation()}>
                <p>Delete this routine?</p>
                <div class="confirm-actions">
                  <button class="confirm-cancel" @click=${() => {
      this._confirmDeleteId = null;
    }}>Cancel</button>
                  <button class="confirm-delete" @click=${this._doDelete}>Delete</button>
                </div>
              </div>
            </div>
          ` : A}
        </div>
      </div>
    `;
  }
  _renderForm() {
    const r2 = this._editingRoutine;
    const tasks = r2.tasks ?? [];
    const items = r2.shopping_items ?? [];
    return b`
      <div class="form-section">
        <div class="form-title">${this._isNew ? "New Routine" : "Edit Routine"}</div>

        <div class="form-row">
          <label>Emoji</label>
          <input
            type="text"
            class="form-emoji-input"
            maxlength="2"
            .value=${r2.emoji ?? ""}
            @input=${(e2) => {
      this._editingRoutine = { ...r2, emoji: e2.target.value };
    }}
          />
        </div>

        <div class="form-row">
          <label>Name</label>
          <input
            type="text"
            class="form-input"
            .value=${r2.name ?? ""}
            @input=${(e2) => {
      this._editingRoutine = { ...r2, name: e2.target.value };
    }}
            placeholder="Routine name"
          />
        </div>

        <div class="form-row">
          <label>Description</label>
          <input
            type="text"
            class="form-input"
            .value=${r2.description ?? ""}
            @input=${(e2) => {
      this._editingRoutine = { ...r2, description: e2.target.value };
    }}
            placeholder="What does it do?"
          />
        </div>

        <div class="form-row">
          <label>Shift</label>
          <select
            class="form-select"
            .value=${r2.shift_template_id ?? ""}
            @change=${(e2) => {
      const val = e2.target.value;
      this._editingRoutine = { ...r2, shift_template_id: val || null };
    }}
          >
            <option value="">None</option>
            ${this.templates.map(
      (t2) => b`<option value=${t2.id} ?selected=${r2.shift_template_id === t2.id}>${t2.emoji ? t2.emoji + " " : ""}${t2.name}</option>`
    )}
          </select>
        </div>

        <!-- Tasks -->
        <div class="inline-list-heading">Tasks</div>
        ${tasks.map((task, idx) => b`
          <div class="inline-row">
            <input
              class="inline-input"
              .value=${task.title ?? ""}
              @input=${(e2) => {
      const newTasks = [...tasks];
      newTasks[idx] = { ...task, title: e2.target.value };
      this._editingRoutine = { ...r2, tasks: newTasks };
    }}
              placeholder="Task title"
            />
            <input
              class="inline-input inline-input-sm"
              type="text"
              .value=${task.list_id ?? "inbox"}
              @input=${(e2) => {
      const newTasks = [...tasks];
      newTasks[idx] = { ...task, list_id: e2.target.value };
      this._editingRoutine = { ...r2, tasks: newTasks };
    }}
              placeholder="list"
              title="List ID"
            />
            <input
              class="inline-input inline-input-sm"
              type="number"
              .value=${String(task.due_offset_days ?? 0)}
              @input=${(e2) => {
      const newTasks = [...tasks];
      newTasks[idx] = { ...task, due_offset_days: parseInt(e2.target.value) || 0 };
      this._editingRoutine = { ...r2, tasks: newTasks };
    }}
              placeholder="+days"
              title="Due offset (days)"
            />
            <button class="inline-remove-btn" @click=${() => {
      const newTasks = tasks.filter((_2, i2) => i2 !== idx);
      this._editingRoutine = { ...r2, tasks: newTasks };
    }}>\u2715</button>
          </div>
        `)}
        <button class="inline-add-btn" @click=${() => {
      const newTasks = [...tasks, { title: "", list_id: "inbox", due_offset_days: 0 }];
      this._editingRoutine = { ...r2, tasks: newTasks };
    }}>+ Add task</button>

        <!-- Shopping items -->
        <div class="inline-list-heading">Shopping Items</div>
        ${items.map((item, idx) => b`
          <div class="inline-row">
            <input
              class="inline-input"
              .value=${item.title ?? ""}
              @input=${(e2) => {
      const newItems = [...items];
      newItems[idx] = { ...item, title: e2.target.value };
      this._editingRoutine = { ...r2, shopping_items: newItems };
    }}
              placeholder="Item title"
            />
            <input
              class="inline-input inline-input-sm"
              type="text"
              .value=${item.category ?? ""}
              @input=${(e2) => {
      const newItems = [...items];
      newItems[idx] = { ...item, category: e2.target.value };
      this._editingRoutine = { ...r2, shopping_items: newItems };
    }}
              placeholder="cat"
              title="Category"
            />
            <input
              class="inline-input inline-input-sm"
              type="number"
              min="0.1"
              step="0.1"
              .value=${String(item.quantity ?? 1)}
              @input=${(e2) => {
      const newItems = [...items];
      const parsed = parseFloat(e2.target.value);
      newItems[idx] = { ...item, quantity: Number.isFinite(parsed) ? Math.max(0.1, parsed) : 1 };
      this._editingRoutine = { ...r2, shopping_items: newItems };
    }}
              placeholder="qty"
              title="Quantity"
            />
            <input
              class="inline-input inline-input-sm"
              type="text"
              .value=${item.unit ?? ""}
              @input=${(e2) => {
      const newItems = [...items];
      newItems[idx] = { ...item, unit: e2.target.value };
      this._editingRoutine = { ...r2, shopping_items: newItems };
    }}
              placeholder="unit"
              title="Unit (L, kg, pcs...)"
            />
            <button class="inline-remove-btn" @click=${() => {
      const newItems = items.filter((_2, i2) => i2 !== idx);
      this._editingRoutine = { ...r2, shopping_items: newItems };
    }}>\u2715</button>
          </div>
        `)}
        <button class="inline-add-btn" @click=${() => {
      const newItems = [...items, { title: "", category: "groceries", quantity: 1, unit: "" }];
      this._editingRoutine = { ...r2, shopping_items: newItems };
    }}>+ Add item</button>

        <div class="form-actions">
          <button class="form-btn form-btn-cancel" @click=${() => {
      this._editingRoutine = null;
    }}>Cancel</button>
          <button
            class="form-btn form-btn-save"
            ?disabled=${!(r2.name ?? "").trim()}
            @click=${this._saveRoutine}
          >Save</button>
        </div>
      </div>
    `;
  }
  /* ── Actions ──────────────────────────────────────────────────────── */
  _onOverlayClick(e2) {
    if (e2.target.classList.contains("overlay")) {
      this._close();
    }
  }
  _close() {
    this._editingRoutine = null;
    this._confirmDeleteId = null;
    this.dispatchEvent(new CustomEvent("dialog-close", { bubbles: true, composed: true }));
  }
  _newRoutine() {
    this._isNew = true;
    this._editingRoutine = {
      name: "",
      emoji: "",
      description: "",
      shift_template_id: null,
      tasks: [],
      shopping_items: []
    };
  }
  _editRoutine(routine) {
    this._isNew = false;
    this._editingRoutine = {
      ...routine,
      tasks: [...routine.tasks],
      shopping_items: [...routine.shopping_items]
    };
  }
  async _saveRoutine() {
    if (!this.hass || !this._editingRoutine) return;
    const r2 = this._editingRoutine;
    try {
      if (this._isNew) {
        await this.hass.callWS({
          type: "calee/create_routine",
          name: r2.name ?? "",
          emoji: r2.emoji ?? "",
          description: r2.description ?? "",
          shift_template_id: r2.shift_template_id ?? void 0,
          tasks: r2.tasks ?? [],
          shopping_items: r2.shopping_items ?? []
        });
      } else {
        await this.hass.callWS({
          type: "calee/update_routine",
          routine_id: r2.id,
          name: r2.name,
          emoji: r2.emoji,
          description: r2.description,
          shift_template_id: r2.shift_template_id,
          tasks: r2.tasks,
          shopping_items: r2.shopping_items
        });
      }
      this._editingRoutine = null;
      this.dispatchEvent(new CustomEvent("routine-changed", { bubbles: true, composed: true }));
    } catch (err) {
      console.error("Failed to save routine:", err);
    }
  }
  async _doDelete() {
    if (!this.hass || !this._confirmDeleteId) return;
    try {
      await this.hass.callWS({
        type: "calee/delete_routine",
        routine_id: this._confirmDeleteId
      });
      this._confirmDeleteId = null;
      this.dispatchEvent(new CustomEvent("routine-changed", { bubbles: true, composed: true }));
    } catch (err) {
      console.error("Failed to delete routine:", err);
    }
  }
};
CaleeRoutineManager.styles = i$3`
    :host {
      display: none;
    }
    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .dialog {
      background: var(--card-background-color, #fff);
      border-radius: 16px;
      width: 100%;
      max-width: 560px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
      padding: 24px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: var(--secondary-text-color, #757575);
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.15s;
    }

    .close-btn:hover {
      background: var(--secondary-background-color, #f0f0f0);
    }

    /* ── Routine list ──────────────────────────────────── */

    .routine-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 8px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }

    .routine-row:last-child {
      border-bottom: none;
    }

    .routine-emoji {
      font-size: 22px;
      width: 32px;
      text-align: center;
      flex-shrink: 0;
    }

    .routine-info {
      flex: 1;
      min-width: 0;
    }

    .routine-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
    }

    .routine-desc {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .routine-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }

    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
      transition: background 0.15s, color 0.15s;
    }

    .icon-btn:hover {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--primary-text-color, #212121);
    }

    .add-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      margin-top: 12px;
      background: none;
      border: 1px dashed var(--divider-color, #e0e0e0);
      border-radius: 8px;
      color: var(--primary-color, #03a9f4);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
      justify-content: center;
      transition: background 0.15s, border-color 0.15s;
      font-family: inherit;
    }

    .add-btn:hover {
      border-color: var(--primary-color, #03a9f4);
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
    }

    /* ── Edit form ─────────────────────────────────────── */

    .form-section {
      margin-top: 16px;
      padding: 16px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 12px;
      background: var(--secondary-background-color, #fafafa);
    }

    .form-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--primary-text-color, #212121);
    }

    .form-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      align-items: center;
    }

    .form-row label {
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color, #757575);
      width: 80px;
      flex-shrink: 0;
    }

    .form-input {
      flex: 1;
      font-size: 14px;
      padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      font-family: inherit;
    }

    .form-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .form-select {
      flex: 1;
      font-size: 13px;
      padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      cursor: pointer;
      font-family: inherit;
    }

    .form-select:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .form-emoji-input {
      width: 48px;
      font-size: 20px;
      text-align: center;
      padding: 4px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      outline: none;
      font-family: inherit;
    }

    .form-emoji-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    /* ── Inline list items ─────────────────────────────── */

    .inline-list-heading {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #757575);
      margin: 12px 0 6px;
    }

    .inline-row {
      display: flex;
      gap: 6px;
      align-items: center;
      margin-bottom: 6px;
    }

    .inline-input {
      flex: 1;
      font-size: 13px;
      padding: 4px 8px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 6px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      font-family: inherit;
    }

    .inline-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .inline-input-sm {
      width: 50px;
      flex: none;
    }

    .inline-remove-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      color: var(--secondary-text-color, #999);
      padding: 2px 6px;
      border-radius: 4px;
      transition: color 0.15s;
    }

    .inline-remove-btn:hover {
      color: var(--error-color, #f44336);
    }

    .inline-add-btn {
      font-size: 12px;
      color: var(--primary-color, #03a9f4);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      font-weight: 500;
      font-family: inherit;
    }

    .inline-add-btn:hover {
      text-decoration: underline;
    }

    /* ── Form actions ──────────────────────────────────── */

    .form-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 14px;
    }

    .form-btn {
      font-size: 13px;
      font-weight: 500;
      padding: 8px 18px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s;
    }

    .form-btn:hover {
      opacity: 0.9;
    }

    .form-btn-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--primary-text-color, #212121);
    }

    .form-btn-save {
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }

    .form-btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ── Delete confirm ────────────────────────────────── */

    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .confirm-dialog {
      background: var(--card-background-color, #fff);
      border-radius: 12px;
      padding: 20px;
      max-width: 320px;
      width: 100%;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .confirm-dialog p {
      font-size: 14px;
      color: var(--primary-text-color, #212121);
      margin: 0 0 16px;
    }

    .confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .confirm-actions button {
      font-size: 13px;
      font-weight: 500;
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s;
    }

    .confirm-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--primary-text-color, #212121);
    }

    .confirm-delete {
      background: var(--error-color, #f44336);
      color: #fff;
    }

    .empty-msg {
      text-align: center;
      padding: 24px 16px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
    }
  `;
__decorateClass$2([
  n2({ attribute: false })
], CaleeRoutineManager.prototype, "hass", 2);
__decorateClass$2([
  n2({ type: Array })
], CaleeRoutineManager.prototype, "routines", 2);
__decorateClass$2([
  n2({ type: Array })
], CaleeRoutineManager.prototype, "templates", 2);
__decorateClass$2([
  n2({ type: Boolean, reflect: true })
], CaleeRoutineManager.prototype, "open", 2);
__decorateClass$2([
  r()
], CaleeRoutineManager.prototype, "_editingRoutine", 2);
__decorateClass$2([
  r()
], CaleeRoutineManager.prototype, "_isNew", 2);
__decorateClass$2([
  r()
], CaleeRoutineManager.prototype, "_confirmDeleteId", 2);
CaleeRoutineManager = __decorateClass$2([
  t("calee-routine-manager")
], CaleeRoutineManager);
var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
var __decorateClass$1 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$1(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$1(target, key, result);
  return result;
};
const COLOUR_OPTIONS = [
  "#e57373",
  "#f06292",
  "#ba68c8",
  "#9575cd",
  "#7986cb",
  "#64b5f6",
  "#4fc3f7",
  "#4dd0e1",
  "#4db6ac",
  "#81c784",
  "#aed581",
  "#dce775",
  "#fff176",
  "#ffd54f",
  "#ffb74d",
  "#ff8a65",
  "#a1887f",
  "#90a4ae"
];
let CaleeCalendarManager = class extends i {
  constructor() {
    super(...arguments);
    this.calendars = [];
    this.lists = [];
    this.open = false;
    this._editingCalendarId = null;
    this._editName = "";
    this._editColor = "#64b5f6";
    this._editEmoji = "";
    this._addingCalendar = false;
    this._newCalName = "";
    this._newCalColor = "#64b5f6";
    this._newCalEmoji = "";
    this._editingListId = null;
    this._editListName = "";
    this._addingList = false;
    this._newListName = "";
    this._newListType = "standard";
    this._confirmDeleteId = null;
    this._confirmDeleteType = null;
  }
  render() {
    if (!this.open) return A;
    return b`
      <div class="backdrop" @click=${this._onBackdropClick}>
        <div class="dialog" @click=${(e2) => e2.stopPropagation()}>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <h2>Manage Calendars & Lists</h2>
            <button class="close-btn" @click=${this._close}>&times;</button>
          </div>

          <h3>Calendars</h3>
          ${this.calendars.map((cal) => this._renderCalendarItem(cal))}
          ${this._addingCalendar ? this._renderAddCalendarForm() : b`
            <button class="add-btn" @click=${() => {
      this._addingCalendar = true;
      this._newCalName = "";
      this._newCalColor = "#64b5f6";
      this._newCalEmoji = "";
    }}>+ Add calendar</button>
          `}

          <h3>Lists</h3>
          ${this.lists.map((lst) => this._renderListItem(lst))}
          ${this._addingList ? this._renderAddListForm() : b`
            <button class="add-btn" @click=${() => {
      this._addingList = true;
      this._newListName = "";
      this._newListType = "standard";
    }}>+ Add list</button>
          `}
        </div>
      </div>
    `;
  }
  _renderCalendarItem(cal) {
    if (this._confirmDeleteId === cal.id && this._confirmDeleteType === "calendar") {
      return b`
        <div class="confirm-box">
          <p>Delete <strong>${cal.name}</strong>? All events in this calendar will be deleted. This cannot be undone.</p>
          <div class="confirm-actions">
            <button class="confirm-delete-btn" @click=${() => this._doDeleteCalendar(cal.id)}>Delete</button>
            <button class="cancel-btn" @click=${() => {
        this._confirmDeleteId = null;
        this._confirmDeleteType = null;
      }}>Cancel</button>
          </div>
        </div>
      `;
    }
    if (this._editingCalendarId === cal.id) {
      return b`
        <div style="padding:8px 0;">
          <div class="edit-row">
            <div class="item-dot" style="background:${this._editColor}"></div>
            <input class="edit-input" .value=${this._editName} @input=${(e2) => {
        this._editName = e2.target.value;
      }} placeholder="Calendar name" />
            <input class="edit-input" style="width:50px;flex:none;" .value=${this._editEmoji} @input=${(e2) => {
        this._editEmoji = e2.target.value;
      }} placeholder="Emoji" />
          </div>
          <div class="color-row">
            ${COLOUR_OPTIONS.map((c2) => b`
              <div class="color-swatch ${this._editColor === c2 ? "selected" : ""}" style="background:${c2}" @click=${() => {
        this._editColor = c2;
      }}></div>
            `)}
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button class="save-btn" @click=${() => this._saveCalendar(cal.id)}>Save</button>
            <button class="cancel-btn" @click=${() => {
        this._editingCalendarId = null;
      }}>Cancel</button>
          </div>
        </div>
      `;
    }
    return b`
      <div class="item-row">
        <div class="item-dot" style="background:${cal.color}"></div>
        <span class="item-name">${cal.emoji ? `${cal.emoji} ` : ""}${cal.name}</span>
        <button class="icon-btn" @click=${() => {
      this._editingCalendarId = cal.id;
      this._editName = cal.name;
      this._editColor = cal.color;
      this._editEmoji = cal.emoji || "";
    }} title="Edit">&#9998;</button>
        <button class="icon-btn danger" @click=${() => {
      this._confirmDeleteId = cal.id;
      this._confirmDeleteType = "calendar";
    }} title="Delete">&#128465;</button>
      </div>
    `;
  }
  _renderAddCalendarForm() {
    return b`
      <div style="padding:8px 0;">
        <div class="edit-row">
          <div class="item-dot" style="background:${this._newCalColor}"></div>
          <input class="edit-input" .value=${this._newCalName} @input=${(e2) => {
      this._newCalName = e2.target.value;
    }} placeholder="Calendar name" />
          <input class="edit-input" style="width:50px;flex:none;" .value=${this._newCalEmoji} @input=${(e2) => {
      this._newCalEmoji = e2.target.value;
    }} placeholder="Emoji" />
        </div>
        <div class="color-row">
          ${COLOUR_OPTIONS.map((c2) => b`
            <div class="color-swatch ${this._newCalColor === c2 ? "selected" : ""}" style="background:${c2}" @click=${() => {
      this._newCalColor = c2;
    }}></div>
          `)}
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="save-btn" @click=${this._addCalendar}>Create</button>
          <button class="cancel-btn" @click=${() => {
      this._addingCalendar = false;
    }}>Cancel</button>
        </div>
      </div>
    `;
  }
  _renderListItem(lst) {
    if (this._confirmDeleteId === lst.id && this._confirmDeleteType === "list") {
      return b`
        <div class="confirm-box">
          <p>Delete <strong>${lst.name}</strong>? All tasks in this list will be deleted. This cannot be undone.</p>
          <div class="confirm-actions">
            <button class="confirm-delete-btn" @click=${() => this._doDeleteList(lst.id)}>Delete</button>
            <button class="cancel-btn" @click=${() => {
        this._confirmDeleteId = null;
        this._confirmDeleteType = null;
      }}>Cancel</button>
          </div>
        </div>
      `;
    }
    if (this._editingListId === lst.id) {
      return b`
        <div class="edit-row">
          <input class="edit-input" .value=${this._editListName} @input=${(e2) => {
        this._editListName = e2.target.value;
      }} placeholder="List name" />
          <button class="save-btn" @click=${() => this._saveList(lst.id)}>Save</button>
          <button class="cancel-btn" @click=${() => {
        this._editingListId = null;
      }}>Cancel</button>
        </div>
      `;
    }
    return b`
      <div class="item-row">
        <span class="item-name">${lst.name}</span>
        <span style="font-size:11px;color:var(--secondary-text-color,#999);padding:2px 6px;border-radius:4px;background:var(--secondary-background-color,#f0f0f0);">${lst.list_type}</span>
        <button class="icon-btn" @click=${() => {
      this._editingListId = lst.id;
      this._editListName = lst.name;
    }} title="Edit">&#9998;</button>
        <button class="icon-btn danger" @click=${() => {
      this._confirmDeleteId = lst.id;
      this._confirmDeleteType = "list";
    }} title="Delete">&#128465;</button>
      </div>
    `;
  }
  _renderAddListForm() {
    return b`
      <div style="padding:8px 0;">
        <div class="edit-row">
          <input class="edit-input" .value=${this._newListName} @input=${(e2) => {
      this._newListName = e2.target.value;
    }} placeholder="List name" />
          <select class="edit-input" style="flex:none;width:120px;" .value=${this._newListType} @change=${(e2) => {
      this._newListType = e2.target.value;
    }}>
            <option value="standard">Standard</option>
            <option value="shopping">Shopping</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="save-btn" @click=${this._addList}>Create</button>
          <button class="cancel-btn" @click=${() => {
      this._addingList = false;
    }}>Cancel</button>
        </div>
      </div>
    `;
  }
  // ── Actions ────────────────────────────────────────────────────────
  async _addCalendar() {
    if (!this._newCalName.trim()) return;
    try {
      await this.hass.callWS({
        type: "calee/create_calendar",
        name: this._newCalName.trim(),
        color: this._newCalColor,
        emoji: this._newCalEmoji
      });
      this._addingCalendar = false;
      this._fireChanged();
    } catch (err) {
      console.error("Failed to create calendar:", err);
    }
  }
  async _saveCalendar(id) {
    try {
      await this.hass.callWS({
        type: "calee/update_calendar",
        calendar_id: id,
        name: this._editName.trim() || void 0,
        color: this._editColor || void 0,
        emoji: this._editEmoji
      });
      this._editingCalendarId = null;
      this._fireChanged();
    } catch (err) {
      console.error("Failed to update calendar:", err);
    }
  }
  async _doDeleteCalendar(id) {
    try {
      await this.hass.callWS({
        type: "calee/delete_calendar",
        calendar_id: id
      });
      this._confirmDeleteId = null;
      this._confirmDeleteType = null;
      this._fireChanged();
    } catch (err) {
      console.error("Failed to delete calendar:", err);
    }
  }
  async _addList() {
    if (!this._newListName.trim()) return;
    try {
      await this.hass.callWS({
        type: "calee/create_list",
        name: this._newListName.trim(),
        list_type: this._newListType
      });
      this._addingList = false;
      this._fireChanged();
    } catch (err) {
      console.error("Failed to create list:", err);
    }
  }
  async _saveList(id) {
    try {
      await this.hass.callWS({
        type: "calee/update_list",
        list_id: id,
        name: this._editListName.trim() || void 0
      });
      this._editingListId = null;
      this._fireChanged();
    } catch (err) {
      console.error("Failed to update list:", err);
    }
  }
  async _doDeleteList(id) {
    try {
      await this.hass.callWS({
        type: "calee/delete_list",
        list_id: id
      });
      this._confirmDeleteId = null;
      this._confirmDeleteType = null;
      this._fireChanged();
    } catch (err) {
      console.error("Failed to delete list:", err);
    }
  }
  // ── Helpers ────────────────────────────────────────────────────────
  _fireChanged() {
    this.dispatchEvent(new CustomEvent("calendar-changed", { bubbles: true, composed: true }));
  }
  _close() {
    this.dispatchEvent(new CustomEvent("dialog-close", { bubbles: true, composed: true }));
  }
  _onBackdropClick(e2) {
    if (e2.target.classList.contains("backdrop")) {
      this._close();
    }
  }
};
CaleeCalendarManager.styles = i$3`
    :host { display: none; }
    :host([open]) { display: block; }

    .backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 100;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.15s ease;
      padding: 16px;
    }
    @keyframes fadeIn { from { opacity: 0; } }

    .dialog {
      background: var(--card-background-color, #fff);
      border-radius: 16px;
      padding: 24px;
      width: 100%; max-width: 500px; max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    }

    h2 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: var(--primary-text-color, #212121); }
    h3 { font-size: 14px; font-weight: 600; margin: 16px 0 8px; color: var(--secondary-text-color, #757575); text-transform: uppercase; letter-spacing: 0.5px; }

    .item-row {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }

    .item-dot {
      width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
    }

    .item-name {
      flex: 1; font-size: 14px; color: var(--primary-text-color, #212121);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .icon-btn {
      all: unset; cursor: pointer; padding: 4px; border-radius: 4px;
      font-size: 13px; color: var(--secondary-text-color, #757575);
      transition: background 0.15s;
    }
    .icon-btn:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
    .icon-btn.danger { color: var(--error-color, #f44336); }

    .edit-row {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 0;
    }

    .edit-input {
      flex: 1; font-size: 14px; padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 6px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none; box-sizing: border-box; font-family: inherit;
    }
    .edit-input:focus { border-color: var(--primary-color, #03a9f4); }

    .color-row {
      display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 0;
    }

    .color-swatch {
      width: 22px; height: 22px; border-radius: 50%; cursor: pointer;
      border: 2px solid transparent; transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .color-swatch.selected { border-color: var(--primary-text-color, #212121); }

    .add-btn {
      all: unset; cursor: pointer;
      font-size: 13px; font-weight: 500;
      color: var(--primary-color, #03a9f4);
      padding: 6px 0; display: block;
    }
    .add-btn:hover { text-decoration: underline; }

    .save-btn {
      padding: 4px 12px; border: none; border-radius: 6px;
      background: var(--primary-color, #03a9f4); color: #fff;
      cursor: pointer; font-size: 13px; font-weight: 500;
    }

    .cancel-btn {
      padding: 4px 12px; border: none; border-radius: 6px;
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--primary-text-color, #212121);
      cursor: pointer; font-size: 13px; font-weight: 500;
    }

    .close-btn {
      all: unset; cursor: pointer; padding: 4px 8px;
      font-size: 18px; color: var(--secondary-text-color, #757575);
      border-radius: 6px; transition: background 0.15s;
    }
    .close-btn:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }

    .confirm-box {
      background: color-mix(in srgb, var(--error-color, #f44336) 8%, transparent);
      border: 1px solid var(--error-color, #f44336);
      border-radius: 8px; padding: 12px; margin: 8px 0;
      font-size: 13px; color: var(--primary-text-color, #212121);
    }
    .confirm-box p { margin: 0 0 8px; }
    .confirm-actions { display: flex; gap: 8px; }
    .confirm-delete-btn {
      padding: 4px 12px; border: none; border-radius: 6px;
      background: var(--error-color, #f44336); color: #fff;
      cursor: pointer; font-size: 13px; font-weight: 500;
    }
  `;
__decorateClass$1([
  n2({ attribute: false })
], CaleeCalendarManager.prototype, "hass", 2);
__decorateClass$1([
  n2({ type: Array })
], CaleeCalendarManager.prototype, "calendars", 2);
__decorateClass$1([
  n2({ type: Array })
], CaleeCalendarManager.prototype, "lists", 2);
__decorateClass$1([
  n2({ type: Boolean, reflect: true })
], CaleeCalendarManager.prototype, "open", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_editingCalendarId", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_editName", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_editColor", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_editEmoji", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_addingCalendar", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_newCalName", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_newCalColor", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_newCalEmoji", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_editingListId", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_editListName", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_addingList", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_newListName", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_newListType", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_confirmDeleteId", 2);
__decorateClass$1([
  r()
], CaleeCalendarManager.prototype, "_confirmDeleteType", 2);
CaleeCalendarManager = __decorateClass$1([
  t("calee-calendar-manager")
], CaleeCalendarManager);
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};
const DATE_VIEWS = ["month", "week", "day", "year"];
const ALL_VIEWS = ["month", "week", "day", "agenda", "tasks", "shopping", "year"];
const TAB_VIEWS = ["week", "month", "agenda", "tasks", "shopping"];
function todayISO() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/");
  const view = ALL_VIEWS.includes(parts[0]) ? parts[0] : "week";
  const date = parts[1] && /^\d{4}-\d{2}-\d{2}$/.test(parts[1]) ? parts[1] : todayISO();
  return { view, date };
}
function buildHash(view, date) {
  if (DATE_VIEWS.includes(view)) {
    return `#/${view}/${date}`;
  }
  return `#/${view}`;
}
function addDays(dateStr, days) {
  const d2 = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
  d2.setDate(d2.getDate() + days);
  return d2.toISOString().slice(0, 10);
}
function formatDateLabel(view, dateStr) {
  const d2 = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
  const opts = { year: "numeric", month: "long" };
  if (view === "year") {
    return String(d2.getFullYear());
  }
  if (view === "day") {
    return d2.toLocaleDateString(void 0, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
  if (view === "week") {
    const start = new Date(d2);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startStr = start.toLocaleDateString(void 0, { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString(void 0, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    return `${startStr} - ${endStr}`;
  }
  return d2.toLocaleDateString(void 0, opts);
}
function dateStep(view) {
  if (view === "day") return 1;
  if (view === "week") return 7;
  return 0;
}
function stepYear(dateStr, delta) {
  const d2 = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
  d2.setFullYear(d2.getFullYear() + delta);
  return d2.toISOString().slice(0, 10);
}
function stepMonth(dateStr, delta) {
  const d2 = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
  d2.setMonth(d2.getMonth() + delta);
  return d2.toISOString().slice(0, 10);
}
let CaleePanel = class extends i {
  constructor() {
    super(...arguments);
    this.narrow = false;
    this._currentView = "week";
    this._currentDate = todayISO();
    this._drawerOpen = false;
    this._sidebarCollapsed = false;
    this._calendars = [];
    this._lists = [];
    this._loading = true;
    this._showAddDialog = false;
    this._events = [];
    this._tasks = [];
    this._templates = [];
    this._presets = [];
    this._routines = [];
    this._rawCalendars = [];
    this._settingsWeekStart = "monday";
    this._settingsTimeFormat = "12h";
    this._settingsCurrency = "$";
    this._settingsBudget = 0;
    this._detailDrawerOpen = false;
    this._detailItem = null;
    this._detailItemType = null;
    this._showRecurringActionDialog = false;
    this._recurringActionEvent = null;
    this._showCalendarManager = false;
    this._conflicts = [];
    this._editEvent = null;
    this._showEventDialog = false;
    this._eventDialogDefaults = {};
    this._showTemplatePicker = false;
    this._templatePickerDate = "";
    this._templatePickerTime = "";
    this._showTemplateManager = false;
    this._showSettings = false;
    this._showDeletedItems = false;
    this._showActivityFeed = false;
    this._showRoutineManager = false;
    this._shoppingToast = "";
    this._hashHandler = this._onHashChange.bind(this);
    this._keyHandler = this._handleKeydown.bind(this);
    this._tasksLoaded = false;
    this._refreshDebounce = null;
  }
  // ── Lifecycle ────────────────────────────────────────────────────
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("hashchange", this._hashHandler);
    window.addEventListener("keydown", this._keyHandler);
    this._applyHash();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("hashchange", this._hashHandler);
    window.removeEventListener("keydown", this._keyHandler);
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = void 0;
    }
  }
  async firstUpdated(_changedProps) {
    try {
      await this._loadSettings();
      try {
        const mod = await Promise.resolve().then(() => plannerStore);
        this._store = new mod.PlannerStore(this.hass);
        await this._store.load();
        this._syncFromStore();
      } catch {
        await this._loadViaWebSocket();
      }
      this._subscribeToChanges();
    } catch (err) {
      console.error("[Calee] Failed to initialise panel:", err);
    } finally {
      this._loading = false;
    }
  }
  updated(changedProps) {
    if (changedProps.has("hass") && this._store) {
      this._store.hass = this.hass;
    }
    if (changedProps.has("_currentView") || changedProps.has("_currentDate")) {
      if (!this._loading) {
        this._loadEvents();
        if (!this._tasksLoaded) {
          this._loadTasks();
        }
      }
    }
  }
  // ── Hash Routing ─────────────────────────────────────────────────
  _applyHash() {
    const { view, date } = parseHash();
    this._currentView = view;
    this._currentDate = date;
    if (!window.location.hash) {
      window.location.hash = buildHash(this._currentView, this._currentDate);
    }
  }
  _onHashChange() {
    this._applyHash();
  }
  _navigate(view, date) {
    const d2 = date ?? this._currentDate;
    window.location.hash = buildHash(view, d2);
  }
  // ── Date Navigation ──────────────────────────────────────────────
  _onPrev() {
    const view = this._currentView;
    if (!DATE_VIEWS.includes(view)) return;
    const step = dateStep(view);
    let newDate;
    if (view === "year") {
      newDate = stepYear(this._currentDate, -1);
    } else if (step > 0) {
      newDate = addDays(this._currentDate, -step);
    } else {
      newDate = stepMonth(this._currentDate, -1);
    }
    this._navigate(view, newDate);
  }
  _onNext() {
    const view = this._currentView;
    if (!DATE_VIEWS.includes(view)) return;
    const step = dateStep(view);
    let newDate;
    if (view === "year") {
      newDate = stepYear(this._currentDate, 1);
    } else if (step > 0) {
      newDate = addDays(this._currentDate, step);
    } else {
      newDate = stepMonth(this._currentDate, 1);
    }
    this._navigate(view, newDate);
  }
  _onToday() {
    this._navigate(this._currentView, todayISO());
  }
  // ── Data Loading ─────────────────────────────────────────────────
  _syncFromStore() {
    if (!this._store) return;
    const store = this._store;
    this._rawCalendars = store.calendars ?? [];
    this._calendars = this._rawCalendars.map((c2) => ({
      id: c2.id,
      name: c2.name,
      color: c2.color,
      visible: true
    }));
    this._lists = store.lists ?? [];
    this._events = store.events ?? [];
    this._tasks = store.tasks ?? [];
    this._templates = store.templates ?? [];
    this._presets = store.presets ?? [];
    this._routines = store.routines ?? [];
    this._tasksLoaded = true;
  }
  async _loadViaWebSocket() {
    if (!this.hass) return;
    try {
      const [calendars, lists, templates, presets, routines] = await Promise.all([
        this.hass.callWS({ type: "calee/calendars" }),
        this.hass.callWS({ type: "calee/lists" }),
        this.hass.callWS({ type: "calee/templates" }),
        this.hass.callWS({ type: "calee/presets" }).catch(() => []),
        this.hass.callWS({ type: "calee/routines" }).catch(() => [])
      ]);
      this._rawCalendars = calendars ?? [];
      this._calendars = this._rawCalendars.map((c2) => ({
        id: c2.id,
        name: c2.name,
        color: c2.color ?? "#64b5f6",
        visible: true
      }));
      this._lists = lists ?? [];
      this._templates = templates ?? [];
      this._presets = presets ?? [];
      this._routines = routines ?? [];
      await this._loadTasks();
    } catch {
      this._rawCalendars = [];
      this._calendars = [];
      this._lists = [];
      this._tasks = [];
      this._templates = [];
      this._presets = [];
      this._routines = [];
    }
    await this._loadEvents();
  }
  /** Load events for the visible date range based on the current view.
   *  Uses the expand_recurring_events endpoint to include virtual recurring instances. */
  async _loadEvents() {
    if (!this.hass) return;
    const { start, end } = this._getViewRange();
    try {
      this._events = await this.hass.callWS({
        type: "calee/expand_recurring_events",
        start,
        end
      }) ?? [];
    } catch {
      try {
        this._events = await this.hass.callWS({
          type: "calee/events",
          start,
          end
        }) ?? [];
      } catch {
      }
    }
    this._conflicts = this._detectConflicts(this._events);
  }
  /** Scan loaded events for overlapping timed events across different calendars. */
  _detectConflicts(events) {
    const timed = events.filter((e2) => !e2.deleted_at && !e2.all_day && e2.start && e2.end).sort((a2, b2) => a2.start.localeCompare(b2.start));
    const conflicts = [];
    for (let i2 = 0; i2 < timed.length; i2++) {
      for (let j = i2 + 1; j < timed.length; j++) {
        const a2 = timed[i2];
        const b2 = timed[j];
        if (b2.start >= a2.end) break;
        if (a2.calendar_id !== b2.calendar_id) {
          conflicts.push({ eventA: a2, eventB: b2 });
        }
      }
    }
    return conflicts;
  }
  /** Recompute conflicts from the current in-memory events list. */
  _recomputeConflicts() {
    this._conflicts = this._detectConflicts(this._events);
  }
  /**
   * Lazy-load tasks via WebSocket.
   * Called when switching to tasks or shopping view for the first time,
   * or on refresh. Avoids loading all tasks on every startup.
   */
  async _loadTasks() {
    if (!this.hass) return;
    try {
      this._tasks = await this.hass.callWS({
        type: "calee/tasks"
      }) ?? [];
      this._tasksLoaded = true;
    } catch {
    }
  }
  /** Calculate the date range for the current view. */
  _getViewRange() {
    const d2 = /* @__PURE__ */ new Date(this._currentDate + "T00:00:00");
    switch (this._currentView) {
      case "day": {
        return {
          start: this._currentDate,
          end: this._currentDate
        };
      }
      case "month": {
        const first = new Date(d2.getFullYear(), d2.getMonth(), 1);
        const last = new Date(d2.getFullYear(), d2.getMonth() + 1, 0);
        const start = new Date(first);
        start.setDate(start.getDate() - 7);
        const end = new Date(last);
        end.setDate(end.getDate() + 7);
        return {
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10)
        };
      }
      case "week": {
        const dow = d2.getDay();
        const mondayOffset = dow === 0 ? -6 : 1 - dow;
        const start = new Date(d2);
        start.setDate(start.getDate() + mondayOffset);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return {
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10)
        };
      }
      case "year": {
        const yearStart = new Date(d2.getFullYear(), 0, 1);
        const yearEnd = new Date(d2.getFullYear(), 11, 31);
        return {
          start: yearStart.toISOString().slice(0, 10),
          end: yearEnd.toISOString().slice(0, 10)
        };
      }
      case "agenda": {
        const end = new Date(d2);
        end.setDate(end.getDate() + 14);
        return {
          start: this._currentDate,
          end: end.toISOString().slice(0, 10)
        };
      }
      default: {
        const start = /* @__PURE__ */ new Date();
        start.setDate(start.getDate() - 30);
        const end = /* @__PURE__ */ new Date();
        end.setDate(end.getDate() + 90);
        return {
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10)
        };
      }
    }
  }
  /** Subscribe to real-time planner change notifications. */
  async _subscribeToChanges() {
    if (!this.hass?.connection) return;
    try {
      this._unsubscribe = await this.hass.connection.subscribeMessage(
        (_event) => {
          this._refreshAll();
        },
        { type: "calee/subscribe" }
      );
    } catch {
    }
  }
  /** Debounced full data refresh triggered by subscription events. */
  _refreshAll() {
    if (this._refreshDebounce) {
      clearTimeout(this._refreshDebounce);
    }
    this._refreshDebounce = setTimeout(async () => {
      this._refreshDebounce = null;
      if (this._store) {
        await this._store.refresh();
        this._syncFromStore();
      } else {
        await this._loadViaWebSocket();
      }
      if (!this._store && (this._currentView === "tasks" || this._currentView === "shopping")) {
        await this._loadTasks();
      }
    }, 250);
  }
  // ── Calendar Toggle ──────────────────────────────────────────────
  _toggleCalendar(id) {
    this._calendars = this._calendars.map(
      (c2) => c2.id === id ? { ...c2, visible: !c2.visible } : c2
    );
  }
  // ── Drawer ───────────────────────────────────────────────────────
  _toggleDrawer() {
    this._drawerOpen = !this._drawerOpen;
  }
  _closeDrawer() {
    this._drawerOpen = false;
  }
  // ── Keyboard shortcuts (desktop) ────────────────────────────────
  _isEditableKeyboardTarget(e2) {
    const isEditableElement = (value) => {
      if (!(value instanceof HTMLElement)) return false;
      const tag = value.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || value.isContentEditable;
    };
    if (e2.composedPath().some((target) => isEditableElement(target))) return true;
    let active = document.activeElement;
    while (active && active.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return isEditableElement(active);
  }
  _handleKeydown(e2) {
    if (this.narrow) return;
    if (this._isEditableKeyboardTarget(e2)) return;
    if (this._showEventDialog || this._showTemplatePicker || this._showTemplateManager || this._showSettings || this._showDeletedItems || this._showActivityFeed || this._showRoutineManager || this._showAddDialog || this._showRecurringActionDialog || this._showCalendarManager) {
      if (e2.key === "Escape") {
        this._onDialogClose();
        this._showDeletedItems = false;
        this._showActivityFeed = false;
        this._showAddDialog = false;
        this._showRecurringActionDialog = false;
        this._showCalendarManager = false;
      }
      return;
    }
    if (e2.ctrlKey || e2.metaKey || e2.altKey) return;
    switch (e2.key) {
      case "n":
        e2.preventDefault();
        this._onSidebarAdd();
        break;
      case "t":
        e2.preventDefault();
        this._onToday();
        break;
      case "w":
        e2.preventDefault();
        this._navigate("week");
        break;
      case "m":
        e2.preventDefault();
        this._navigate("month");
        break;
      case "a":
        e2.preventDefault();
        this._navigate("agenda");
        break;
      case "1":
        e2.preventDefault();
        this._navigate("tasks");
        break;
      case "2":
        e2.preventDefault();
        this._navigate("shopping");
        break;
      case "ArrowLeft":
        e2.preventDefault();
        this._onPrev();
        break;
      case "ArrowRight":
        e2.preventDefault();
        this._onNext();
        break;
      case "Escape":
        if (this._drawerOpen) {
          this._closeDrawer();
        }
        if (this._detailDrawerOpen) {
          this._closeDetailDrawer();
        }
        break;
    }
  }
  // ── Computed helpers ──────────────────────────────────────────────
  /** Map of calendar ID to PlannerCalendar for passing to view components. */
  get _calendarMap() {
    const map = /* @__PURE__ */ new Map();
    for (const c2 of this._rawCalendars) {
      map.set(c2.id, c2);
    }
    return map;
  }
  /** Set of enabled (visible) calendar IDs. */
  get _enabledIds() {
    return new Set(
      this._calendars.filter((c2) => c2.visible).map((c2) => c2.id)
    );
  }
  /** Only work shifts — used for progress/next-shift sidebar cards. */
  get _workEvents() {
    return this._events.filter((e2) => e2.calendar_id === "work_shifts");
  }
  /** The currently active shift (started but not yet ended). */
  get _currentShift() {
    const now = Date.now();
    return this._workEvents.find((e2) => {
      if (e2.deleted_at || e2.all_day) return false;
      const start = new Date(e2.start).getTime();
      const end = new Date(e2.end).getTime();
      return start <= now && end > now;
    }) ?? null;
  }
  /** The next upcoming shift (starts in the future). */
  get _nextShift() {
    const now = Date.now();
    const upcoming = this._workEvents.filter((e2) => {
      if (e2.deleted_at || e2.all_day) return false;
      return new Date(e2.start).getTime() > now;
    }).sort((a2, b2) => new Date(a2.start).getTime() - new Date(b2.start).getTime());
    return upcoming[0] ?? null;
  }
  /** Next 5 events across ALL calendars for the upcoming sidebar section. */
  get _upcomingEvents() {
    const now = Date.now();
    return this._events.filter((e2) => {
      if (e2.deleted_at) return false;
      return new Date(e2.start).getTime() > now;
    }).sort((a2, b2) => new Date(a2.start).getTime() - new Date(b2.start).getTime()).slice(0, 5);
  }
  /** Tasks for the shopping list. */
  get _shoppingTasks() {
    const shoppingList = this._lists.find((l2) => l2.list_type === "shopping");
    if (!shoppingList) return this._tasks.filter((t2) => t2.list_id === "shopping");
    return this._tasks.filter((t2) => t2.list_id === shoppingList.id);
  }
  /** Tasks for standard task lists. */
  get _standardTasks() {
    const shoppingIds = new Set(
      this._lists.filter((l2) => l2.list_type === "shopping").map((l2) => l2.id)
    );
    return this._tasks.filter((t2) => !shoppingIds.has(t2.list_id));
  }
  render() {
    return b`
      ${this._renderHeader()}
      <div class="body">
        ${this._renderSidebarBackdrop()}
        ${this._renderSidebar()}
        <div class="main"
          @event-click=${this._onEventClick}
          @cell-click=${this._onCellClick}
          @task-click=${this._onTaskClick}
          @task-complete=${this._onTaskComplete}
          @task-uncomplete=${this._onTaskUncomplete}
          @task-delete=${this._onTaskDelete}
          @task-quick-add=${this._onTaskQuickAdd}
          @task-update=${this._onTaskUpdate}
          @task-price-update=${this._onTaskPriceUpdate}
          @task-quantity-update=${this._onTaskQuantityUpdate}
          @task-unit-update=${this._onTaskUnitUpdate}
          @routine-execute=${this._onRoutineExecute}
          @preset-add=${this._onPresetAdd}
          @preset-create=${this._onPresetCreate}
          @preset-delete=${this._onPresetDelete}
          @event-select=${this._onEventSelect}
        >
          ${this._loading ? b`<div class="loading">Loading...</div>` : this._renderView()}
        </div>
        ${this._renderDetailDrawer()}
      </div>
      ${this._renderBottomNav()}
      ${this._showAddDialog ? this._renderAddDialog() : A}
      <calee-event-dialog
        .event=${this._editEvent}
        .calendars=${this._rawCalendars}
        .defaults=${this._eventDialogDefaults}
        ?open=${this._showEventDialog}
        @event-save=${this._onEventSave}
        @event-delete=${this._onEventDelete}
        @dialog-close=${this._onDialogClose}
      ></calee-event-dialog>
      <calee-template-picker
        .templates=${this._templates}
        .selectedDate=${this._templatePickerDate || this._currentDate}
        .selectedTime=${this._templatePickerTime}
        ?open=${this._showTemplatePicker}
        @template-select=${this._onTemplateSelect}
        @custom-event=${this._onCustomEvent}
        @quick-add-task=${this._onQuickAddTask}
        @quick-add-shopping=${this._onQuickAddShopping}
        @manage-templates=${this._onManageTemplates}
        @dialog-close=${this._onDialogClose}
      ></calee-template-picker>
      <calee-template-manager
        .templates=${this._templates}
        .calendars=${this._rawCalendars}
        .hass=${this.hass}
        ?open=${this._showTemplateManager}
        @template-created=${this._onTemplateChanged}
        @template-deleted=${this._onTemplateChanged}
        @dialog-close=${this._onManagerClose}
      ></calee-template-manager>
      <calee-settings-dialog
        .hass=${this.hass}
        ?open=${this._showSettings}
        @settings-changed=${this._onSettingsChanged}
        @dialog-close=${this._onSettingsClose}
      ></calee-settings-dialog>
      <calee-deleted-items
        .hass=${this.hass}
        .calendars=${this._rawCalendars}
        .lists=${this._lists}
        ?open=${this._showDeletedItems}
        @dialog-close=${this._onDeletedItemsClose}
      ></calee-deleted-items>
      <calee-activity-feed
        .hass=${this.hass}
        ?open=${this._showActivityFeed}
        @dialog-close=${this._onActivityFeedClose}
      ></calee-activity-feed>
      <calee-routine-manager
        .hass=${this.hass}
        .routines=${this._routines}
        .templates=${this._templates}
        ?open=${this._showRoutineManager}
        @routine-changed=${this._onRoutineChanged}
        @dialog-close=${this._onRoutineManagerClose}
      ></calee-routine-manager>
      <calee-calendar-manager
        .hass=${this.hass}
        .calendars=${this._rawCalendars}
        .lists=${this._lists}
        ?open=${this._showCalendarManager}
        @calendar-changed=${this._onCalendarManagerChanged}
        @dialog-close=${this._onCalendarManagerClose}
      ></calee-calendar-manager>
      ${this._showRecurringActionDialog ? this._renderRecurringActionDialog() : A}
    `;
  }
  // ── Header ───────────────────────────────────────────────────────
  _renderHeader() {
    const showDateNav = DATE_VIEWS.includes(this._currentView);
    return b`
      <div class="header">
        <div class="header-left">
          <button
            class="hamburger"
            @click=${this._toggleDrawer}
            aria-label="Toggle sidebar"
          >&#9776;</button>
          <span class="title">Calee</span>
        </div>

        <div class="header-tabs">
          ${TAB_VIEWS.map(
      (v2) => b`
              <button
                class="view-tab"
                ?active=${this._currentView === v2}
                @click=${() => this._navigate(v2)}
              >${v2}</button>
            `
    )}
        </div>

        ${showDateNav ? b`
          <div class="header-date-nav">
            <button class="date-nav-btn" @click=${this._onPrev} aria-label="Previous">&lsaquo;</button>
            <button class="today-btn" @click=${this._onToday}>Today</button>
            <button class="date-nav-btn" @click=${this._onNext} aria-label="Next">&rsaquo;</button>
            <span class="date-label">${formatDateLabel(this._currentView, this._currentDate)}</span>
          </div>
        ` : b`<div class="header-date-nav"></div>`}

        <button class="settings-cog" @click=${this._openSettings} aria-label="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
          </svg>
        </button>
      </div>
    `;
  }
  // ── Sidebar ──────────────────────────────────────────────────────
  _renderSidebarBackdrop() {
    return b`
      <div
        class="sidebar-backdrop ${this._drawerOpen ? "visible" : ""}"
        @click=${this._closeDrawer}
      ></div>
    `;
  }
  _renderSidebar() {
    return b`
      <div class="sidebar ${this._drawerOpen ? "open" : ""} ${this._sidebarCollapsed ? "collapsed" : ""}">
        <button
          class="sidebar-collapse-btn"
          @click=${() => {
      this._sidebarCollapsed = !this._sidebarCollapsed;
    }}
          title="${this._sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}"
          aria-label="${this._sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}"
          aria-expanded="${(!this._sidebarCollapsed).toString()}"
          aria-pressed="${this._sidebarCollapsed.toString()}"
        >
          ${this._sidebarCollapsed ? "▶" : "◀"}
        </button>
        <!-- Add button -->
        <button class="sidebar-add-btn" @click=${this._onSidebarAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add event
        </button>

        <!-- Navigation -->
        <div class="sidebar-nav">
          <button
            class="nav-item"
            ?active=${this._currentView === "tasks"}
            @click=${() => this._navigate("tasks")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
              <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"></path>
            </svg>
            Inbox
          </button>

          <button
            class="nav-item"
            ?active=${this._currentView === "day"}
            @click=${() => this._navigate("day", todayISO())}
          >
            <div class="nav-calendar-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span class="date-num">${(/* @__PURE__ */ new Date()).getDate()}</span>
            </div>
            Today
          </button>

          <button
            class="nav-item"
            ?active=${this._currentView === "agenda"}
            @click=${() => this._navigate("agenda")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <line x1="8" y1="14" x2="16" y2="14"></line>
              <line x1="8" y1="18" x2="12" y2="18"></line>
            </svg>
            Upcoming
          </button>
        </div>

        <!-- Calendars -->
        <div class="sidebar-section">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 12px 6px;">
            <h3 class="sidebar-heading" style="padding:0;margin:0;">Calendars</h3>
            <button
              style="all:unset;font-size:11px;color:var(--primary-color,#03a9f4);cursor:pointer;font-weight:500;"
              @click=${() => {
      this._showCalendarManager = true;
    }}
            >Manage</button>
          </div>
          ${this._calendars.length === 0 ? b`<div style="font-size:13px;color:var(--secondary-text-color,#999);padding:6px 12px;">No calendars loaded</div>` : this._calendars.map(
      (cal) => b`
                  <div
                    class="calendar-item"
                    @click=${() => this._toggleCalendar(cal.id)}
                  >
                    <div
                      class="calendar-dot ${cal.visible ? "" : "hidden"}"
                      style="--cal-color: ${cal.color}"
                    ></div>
                    <span class="calendar-name">${cal.name}</span>
                  </div>
                `
    )}
        </div>

        <!-- Lists -->
        <div class="sidebar-section">
          <h3 class="sidebar-heading">Lists</h3>
          ${this._lists.length === 0 ? b`<div style="font-size:13px;color:var(--secondary-text-color,#999);padding:6px 12px;">No lists loaded</div>` : this._lists.map(
      (lst) => b`
                  <div
                    class="list-item"
                    ?active=${this._currentView === "tasks" && lst.list_type === "standard" || this._currentView === "shopping" && lst.list_type === "shopping"}
                    @click=${() => this._navigate(
        lst.list_type === "shopping" ? "shopping" : "tasks"
      )}
                  >
                    ${lst.list_type === "shopping" ? b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="9" cy="21" r="1"></circle>
                          <circle cx="20" cy="21" r="1"></circle>
                          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"></path>
                        </svg>` : b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>`}
                    <span>${lst.name}</span>
                  </div>
                `
    )}
        </div>

        <!-- Routines -->
        <div class="sidebar-section">
          <h3 class="sidebar-heading">Routines</h3>
          ${this._routines.map(
      (r2) => b`
              <button
                class="nav-item nav-item-muted"
                @click=${() => this._executeRoutine(r2.id)}
                title="${r2.description || `Run ${r2.name}`}"
              >
                <span style="font-size:18px;width:20px;text-align:center;flex-shrink:0;">${r2.emoji || "⚡"}</span>
                <span>${r2.name}</span>
              </button>
            `
    )}
          <button
            class="nav-item nav-item-muted"
            @click=${() => {
      this._showRoutineManager = true;
    }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"></path>
            </svg>
            Manage routines
          </button>
        </div>

        <!-- More: Year, Recently Deleted & Activity -->
        <div class="sidebar-section">
          <h3 class="sidebar-heading">More</h3>
          <button
            class="nav-item nav-item-muted"
            ?active=${this._currentView === "year"}
            @click=${() => this._navigate("year", todayISO())}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <line x1="3" y1="16" x2="21" y2="16"></line>
              <line x1="9" y1="4" x2="9" y2="22"></line>
              <line x1="15" y1="4" x2="15" y2="22"></line>
            </svg>
            Year
          </button>
          <button
            class="nav-item nav-item-muted"
            @click=${this._openDeletedItems}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
            Recently Deleted
          </button>
          <button
            class="nav-item nav-item-muted"
            @click=${this._openActivityFeed}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            Activity
          </button>
        </div>

        <!-- Conflicts -->
        ${this._conflicts.length > 0 ? b`
          <div class="sidebar-section">
            <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--warning-color,#ff9800)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0;">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span style="font-size:13px;color:var(--warning-color,#ff9800);font-weight:500;">${this._conflicts.length} conflict${this._conflicts.length === 1 ? "" : "s"}</span>
            </div>
          </div>
        ` : A}

        <!-- Shift cards -->
        <div class="sidebar-cards">
          <calee-shift-progress
            .currentShift=${this._currentShift}
          ></calee-shift-progress>
          <calee-next-shift
            .nextShift=${this._nextShift}
          ></calee-next-shift>
        </div>

        <!-- Upcoming events (all calendars) -->
        ${this._upcomingEvents.length > 0 ? b`
          <div class="sidebar-upcoming">
            <div class="section-label">Upcoming</div>
            ${this._upcomingEvents.map((ev) => {
      const cal = this._calendarMap.get(ev.calendar_id);
      const calColor = cal?.color ?? "#64b5f6";
      const t2 = new Date(ev.start);
      const timeStr = t2.toLocaleTimeString(void 0, {
        hour: "numeric",
        minute: "2-digit"
      });
      const now = /* @__PURE__ */ new Date();
      const isToday2 = t2.getFullYear() === now.getFullYear() && t2.getMonth() === now.getMonth() && t2.getDate() === now.getDate();
      const tom = new Date(now);
      tom.setDate(tom.getDate() + 1);
      const isTomorrow = t2.getFullYear() === tom.getFullYear() && t2.getMonth() === tom.getMonth() && t2.getDate() === tom.getDate();
      const dayLabel = isToday2 ? "" : isTomorrow ? "Tmrw " : `${t2.toLocaleDateString(void 0, { weekday: "short" })} `;
      return b`
                <div class="upcoming-item">
                  <span class="dot" style="background: ${calColor}"></span>
                  <span class="upcoming-title">${ev.title}</span>
                  <span class="upcoming-time">${dayLabel}${timeStr}</span>
                </div>
              `;
    })}
          </div>
        ` : A}
      </div>
    `;
  }
  // ── Detail Drawer (desktop) ──────────────────────────────────────
  _renderDetailDrawer() {
    const open = this._detailDrawerOpen && this._detailItem && !this.narrow;
    return b`
      <div class="detail-drawer ${open ? "" : "closed"}">
        ${open ? this._renderDetailDrawerContent() : A}
      </div>
    `;
  }
  _renderDetailDrawerContent() {
    if (!this._detailItem) return A;
    if (this._detailItemType === "event") {
      return this._renderEventDetail(this._detailItem);
    }
    return this._renderTaskDetail(this._detailItem);
  }
  _renderEventDetail(event) {
    const cal = this._calendarMap.get(event.calendar_id);
    const start = new Date(event.start);
    const end = new Date(event.end);
    const eventConflicts = this._conflicts.filter(
      (c2) => c2.eventA.id === event.id || c2.eventB.id === event.id
    );
    const conflictNames = eventConflicts.map((c2) => {
      const other = c2.eventA.id === event.id ? c2.eventB : c2.eventA;
      return other.title;
    });
    const dateOpts = {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    };
    const timeOpts = {
      hour: "numeric",
      minute: "2-digit"
    };
    const linkedTasks = this._tasks.filter(
      (t2) => t2.related_event_id === event.id && !t2.deleted_at
    );
    return b`
      <div class="drawer-header">
        <h3>Event</h3>
        <button class="drawer-close-btn" @click=${this._closeDetailDrawer} aria-label="Close">&times;</button>
      </div>

      ${conflictNames.length > 0 ? b`
        <div style="background:color-mix(in srgb,var(--warning-color,#ff9800) 12%,transparent);border:1px solid var(--warning-color,#ff9800);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:var(--primary-text-color,#212121);">
          <strong style="color:var(--warning-color,#ff9800);">Conflict:</strong> Overlaps with ${conflictNames.join(", ")}
        </div>
      ` : A}

      <div class="drawer-field">
        <div class="drawer-field-label">Title</div>
        <div class="drawer-field-value">${event.title}</div>
      </div>

      <div class="drawer-field">
        <div class="drawer-field-label">Calendar</div>
        <div class="drawer-field-value">
          ${cal ? b`<span style="display:inline-flex;align-items:center;gap:6px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${cal.color};display:inline-block;"></span>
            ${cal.name}
          </span>` : b`<span class="muted">Unknown</span>`}
        </div>
      </div>

      <div class="drawer-field">
        <div class="drawer-field-label">Start</div>
        <div class="drawer-field-value">
          ${event.all_day ? start.toLocaleDateString(void 0, dateOpts) : b`${start.toLocaleDateString(void 0, dateOpts)} at ${start.toLocaleTimeString(void 0, timeOpts)}`}
        </div>
      </div>

      <div class="drawer-field">
        <div class="drawer-field-label">End</div>
        <div class="drawer-field-value">
          ${event.all_day ? end.toLocaleDateString(void 0, dateOpts) : b`${end.toLocaleDateString(void 0, dateOpts)} at ${end.toLocaleTimeString(void 0, timeOpts)}`}
        </div>
      </div>

      ${event.recurrence_rule ? b`
        <div class="drawer-field">
          <div class="drawer-field-label">Recurrence</div>
          <div class="drawer-field-value">
            <span class="drawer-badge">${event.recurrence_rule}</span>
          </div>
        </div>
      ` : A}

      <div class="drawer-field">
        <div class="drawer-field-label">Note</div>
        <div class="drawer-field-value ${event.note ? "" : "muted"}">
          ${event.note || "No note"}
        </div>
      </div>

      ${linkedTasks.length > 0 ? b`
        <div class="drawer-field">
          <div class="drawer-field-label">Linked Tasks</div>
          ${linkedTasks.map(
      (t2) => b`<div class="drawer-field-value" style="margin-bottom:4px;">
              ${t2.completed ? b`<s>${t2.title}</s>` : t2.title}
            </div>`
    )}
        </div>
      ` : A}

      ${event.is_recurring_instance ? b`
        <div class="drawer-actions" style="flex-wrap:wrap;">
          <button class="drawer-btn drawer-btn-edit" @click=${() => this._onEditThisOccurrence(event)}>Edit this occurrence</button>
          <button class="drawer-btn drawer-btn-edit" style="background:var(--secondary-text-color,#727272);" @click=${() => this._onEditAllOccurrences(event)}>Edit all</button>
          <button class="drawer-btn drawer-btn-delete" @click=${() => this._onDeleteThisOccurrence(event)}>Delete this occurrence</button>
          <button class="drawer-btn drawer-btn-delete" @click=${() => this._onDeleteAllOccurrences(event)}>Delete all</button>
        </div>
      ` : b`
        <div class="drawer-actions">
          <button class="drawer-btn drawer-btn-edit" @click=${() => this._onDrawerEditEvent(event)}>Edit</button>
          <button class="drawer-btn drawer-btn-delete" @click=${() => this._onDrawerDeleteEvent(event)}>Delete</button>
        </div>
      `}
    `;
  }
  _renderTaskDetail(task) {
    const list = this._lists.find((l2) => l2.id === task.list_id);
    const linkedEvent = task.related_event_id ? this._events.find((e2) => e2.id === task.related_event_id) : null;
    return b`
      <div class="drawer-header">
        <h3>Task</h3>
        <button class="drawer-close-btn" @click=${this._closeDetailDrawer} aria-label="Close">&times;</button>
      </div>

      <div class="drawer-field">
        <div class="drawer-field-label">Title</div>
        <div class="drawer-field-value">${task.completed ? b`<s>${task.title}</s>` : task.title}</div>
      </div>

      <div class="drawer-field">
        <div class="drawer-field-label">List</div>
        <div class="drawer-field-value">${list?.name ?? task.list_id}</div>
      </div>

      ${task.due ? b`
        <div class="drawer-field">
          <div class="drawer-field-label">Due Date</div>
          <div class="drawer-field-value">
            ${(/* @__PURE__ */ new Date(task.due + "T00:00:00")).toLocaleDateString(void 0, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    })}
          </div>
        </div>
      ` : A}

      ${task.recurrence_rule ? b`
        <div class="drawer-field">
          <div class="drawer-field-label">Recurrence</div>
          <div class="drawer-field-value">
            <span class="drawer-badge">${task.recurrence_rule}</span>
          </div>
        </div>
      ` : A}

      <div class="drawer-field">
        <div class="drawer-field-label">Note</div>
        <div class="drawer-field-value ${task.note ? "" : "muted"}">
          ${task.note || "No note"}
        </div>
      </div>

      ${linkedEvent ? b`
        <div class="drawer-field">
          <div class="drawer-field-label">Linked Event</div>
          <div class="drawer-field-value">${linkedEvent.title}</div>
        </div>
      ` : A}

      <div class="drawer-actions">
        <button class="drawer-btn drawer-btn-edit" @click=${() => this._onDrawerEditTask(task)}>Open in Tasks</button>
        <button class="drawer-btn drawer-btn-delete" @click=${() => this._onDrawerDeleteTask(task)}>Delete</button>
      </div>
    `;
  }
  _openDetailDrawer(item, type) {
    this._detailItem = item;
    this._detailItemType = type;
    this._detailDrawerOpen = true;
  }
  _closeDetailDrawer() {
    this._detailDrawerOpen = false;
    this._detailItem = null;
    this._detailItemType = null;
  }
  _onDrawerEditEvent(event) {
    this._closeDetailDrawer();
    this._editEvent = event;
    this._showEventDialog = true;
  }
  async _onDrawerDeleteEvent(event) {
    try {
      await this.hass.callWS({
        type: "calee/delete_event",
        event_id: event.id
      });
      this._events = this._events.filter((ev) => ev.id !== event.id);
      this._closeDetailDrawer();
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  }
  _onDrawerEditTask(task) {
    this._closeDetailDrawer();
    window.location.hash = `#/tasks/${task.id}`;
  }
  async _onDrawerDeleteTask(task) {
    try {
      await this.hass.callWS({
        type: "calee/delete_task",
        task_id: task.id
      });
      this._tasks = this._tasks.filter((t2) => t2.id !== task.id);
      this._closeDetailDrawer();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }
  // ── Recurring event actions ────────────────────────────────────────
  /** Extract the occurrence date from a recurring instance ID like "{parentId}_{YYYY-MM-DD}". */
  _getOccurrenceDate(event) {
    const parentId = event.parent_event_id;
    if (parentId && event.id.startsWith(parentId + "_")) {
      return event.id.slice(parentId.length + 1);
    }
    return event.start.slice(0, 10);
  }
  /** Edit this occurrence: create standalone event and add exception to parent. */
  async _onEditThisOccurrence(event) {
    const parentId = event.parent_event_id || event.id.split("_").slice(0, -1).join("_");
    const occDate = this._getOccurrenceDate(event);
    this._closeDetailDrawer();
    const standalone = {
      ...event,
      id: "",
      // No ID yet — will be created
      recurrence_rule: null,
      exceptions: []
    };
    standalone._occurrenceParentId = parentId;
    standalone._occurrenceDate = occDate;
    this._editEvent = standalone;
    this._showEventDialog = true;
  }
  /** Edit all occurrences: open the parent event for editing. */
  _onEditAllOccurrences(event) {
    const parentId = event.parent_event_id || event.id.split("_").slice(0, -1).join("_");
    this._closeDetailDrawer();
    this._loadParentAndEdit(parentId);
  }
  async _loadParentAndEdit(parentId) {
    try {
      const allEvents = await this.hass.callWS({
        type: "calee/events"
      });
      const parent = allEvents.find((e2) => e2.id === parentId);
      if (parent) {
        this._editEvent = parent;
        this._showEventDialog = true;
      }
    } catch {
      console.error("Failed to load parent event");
    }
  }
  /** Delete this occurrence: add exception to parent without creating replacement. */
  async _onDeleteThisOccurrence(event) {
    const parentId = event.parent_event_id || event.id.split("_").slice(0, -1).join("_");
    const occDate = this._getOccurrenceDate(event);
    try {
      await this.hass.callWS({
        type: "calee/add_event_exception",
        event_id: parentId,
        date: occDate
      });
      this._events = this._events.filter((ev) => ev.id !== event.id);
      this._recomputeConflicts();
      this._closeDetailDrawer();
    } catch (err) {
      console.error("Failed to delete occurrence:", err);
    }
  }
  /** Delete all occurrences: soft-delete the parent event. */
  async _onDeleteAllOccurrences(event) {
    const parentId = event.parent_event_id || event.id.split("_").slice(0, -1).join("_");
    try {
      await this.hass.callWS({
        type: "calee/delete_event",
        event_id: parentId
      });
      this._events = this._events.filter(
        (ev) => ev.id !== parentId && !(ev.parent_event_id === parentId)
      );
      this._recomputeConflicts();
      this._closeDetailDrawer();
    } catch (err) {
      console.error("Failed to delete all occurrences:", err);
    }
  }
  // ── View Area ────────────────────────────────────────────────────
  _renderView() {
    const selectedDate = /* @__PURE__ */ new Date(this._currentDate + "T00:00:00");
    const calendarMap = this._calendarMap;
    const enabledIds = this._enabledIds;
    switch (this._currentView) {
      case "month":
        return b`<calee-month-view
          .events=${this._events}
          .calendars=${calendarMap}
          .enabledCalendarIds=${enabledIds}
          .selectedDate=${selectedDate}
          .templates=${this._templates}
          .tasks=${this._tasks}
          .conflicts=${this._conflicts}
          .weekStartsMonday=${this._settingsWeekStart === "monday"}
          ?narrow=${this.narrow}
        ></calee-month-view>`;
      case "week":
        return b`<calee-week-view
          .events=${this._events}
          .calendars=${calendarMap}
          .enabledCalendarIds=${enabledIds}
          .selectedDate=${selectedDate}
          .templates=${this._templates}
          .tasks=${this._tasks}
          .weekStartsMonday=${this._settingsWeekStart === "monday"}
          ?narrow=${this.narrow}
        ></calee-week-view>`;
      case "day":
        return b`<calee-day-view
          .events=${this._events}
          .calendars=${calendarMap}
          .enabledCalendarIds=${enabledIds}
          .selectedDate=${selectedDate}
        ></calee-day-view>`;
      case "year":
        return b`<calee-year-view
          .events=${this._events}
          .calendars=${calendarMap}
          .enabledCalendarIds=${enabledIds}
          .selectedDate=${selectedDate}
          @day-click=${this._onYearDayClick}
        ></calee-year-view>`;
      case "agenda":
        return b`<calee-agenda-view
          .events=${this._events}
          .calendars=${calendarMap}
        ></calee-agenda-view>`;
      case "tasks":
        return b`<calee-tasks-view
          .tasks=${this._standardTasks}
          .lists=${this._lists.filter((l2) => l2.list_type !== "shopping")}
          .presets=${this._presets.filter((p2) => p2.list_id !== "shopping")}
          ?narrow=${this.narrow}
        ></calee-tasks-view>`;
      case "shopping": {
        const shoppingList = this._lists.find((l2) => l2.list_type === "shopping");
        return b`<calee-shopping-view
          .tasks=${this._shoppingTasks}
          .presets=${this._presets.filter((p2) => {
          return shoppingList ? p2.list_id === shoppingList.id : p2.list_id === "shopping";
        })}
          .listId=${shoppingList?.id ?? "shopping"}
          .currency=${this._settingsCurrency}
          .budget=${this._settingsBudget}
          .toastMessage=${this._shoppingToast}
          @toast-shown=${() => {
          this._shoppingToast = "";
        }}
        ></calee-shopping-view>`;
      }
      default:
        return b`<div class="view-placeholder">
          <div class="inner">
            <div class="label">Unknown view</div>
          </div>
        </div>`;
    }
  }
  // ── Bottom Nav (mobile) ──────────────────────────────────────────
  _renderBottomNav() {
    const views = [
      { key: "week", label: "Week", icon: "M3 4h18v18H3zM3 10h18M3 16h18M8 2v4M16 2v4" },
      { key: "month", label: "Month", icon: "M3 4h18v18H3zM3 10h18M9 4v18M15 4v18" },
      { key: "agenda", label: "Agenda", icon: "M3 4h18v18H3zM3 10h18M8 2v4M16 2v4M8 14h8M8 18h4" },
      { key: "tasks", label: "Tasks", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" },
      { key: "shopping", label: "Shop", icon: "M9 21a1 1 0 100-2 1 1 0 000 2zM20 21a1 1 0 100-2 1 1 0 000 2zM1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" }
    ];
    return b`
      <nav class="bottom-nav">
        ${views.map((v2) => b`
          <button
            class="bottom-nav-item"
            ?active=${this._currentView === v2.key}
            @click=${() => this._navigate(v2.key)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="${v2.icon}"></path>
            </svg>
            ${v2.label}
          </button>
        `)}
      </nav>
    `;
  }
  // ── Sidebar Add ─────────────────────────────────────────────────
  _onSidebarAdd() {
    this._templatePickerDate = this._currentDate;
    this._templatePickerTime = "";
    this._showTemplatePicker = true;
  }
  // ── View Event Handlers ──────────────────────────────────────────
  /** Handle event-click from calendar views — open detail drawer (desktop) or edit dialog (mobile). */
  _onEventClick(e2) {
    const { eventId } = e2.detail;
    const event = this._events.find((ev) => ev.id === eventId);
    if (event) {
      if (this.narrow) {
        if (event.is_recurring_instance) {
          this._recurringActionEvent = event;
          this._showRecurringActionDialog = true;
        } else {
          this._editEvent = event;
          this._showEventDialog = true;
        }
      } else {
        this._openDetailDrawer(event, "event");
      }
    }
  }
  /** Handle event-select from agenda view — open detail drawer (desktop) or edit dialog (mobile). */
  _onEventSelect(e2) {
    if (this.narrow) {
      this._editEvent = e2.detail.event;
      this._showEventDialog = true;
    } else {
      this._openDetailDrawer(e2.detail.event, "event");
    }
  }
  /** Handle task-click from tasks view — open detail drawer (desktop) or inline edit (mobile). */
  _onTaskClick(e2) {
    if (!this.narrow) {
      this._openDetailDrawer(e2.detail.task, "task");
    }
  }
  /** Handle cell-click from calendar views — open the template picker for quick shift creation. */
  _onCellClick(e2) {
    const { date, time } = e2.detail;
    this._templatePickerDate = date;
    this._templatePickerTime = time ?? "";
    this._showTemplatePicker = true;
  }
  /** Handle task-complete from tasks/shopping views. */
  async _onTaskComplete(e2) {
    try {
      await this.hass.callWS({
        type: "calee/complete_task",
        task_id: e2.detail.taskId
      });
      this._tasks = this._tasks.map(
        (t2) => t2.id === e2.detail.taskId ? { ...t2, completed: true } : t2
      );
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  }
  /** Handle task-uncomplete from shopping view — sets completed=false. */
  async _onTaskUncomplete(e2) {
    try {
      await this.hass.callWS({
        type: "calee/uncomplete_task",
        task_id: e2.detail.taskId
      });
      this._tasks = this._tasks.map(
        (t2) => t2.id === e2.detail.taskId ? { ...t2, completed: false } : t2
      );
    } catch (err) {
      console.error("Failed to uncomplete task:", err);
    }
  }
  /** Handle task-delete from swipe-to-delete on tasks/shopping views. */
  async _onTaskDelete(e2) {
    try {
      await this.hass.callWS({
        type: "calee/delete_task",
        task_id: e2.detail.taskId
      });
      this._tasks = this._tasks.filter((t2) => t2.id !== e2.detail.taskId);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }
  /** Handle task-price-update from shopping view. */
  async _onTaskPriceUpdate(e2) {
    const { taskId, price, version } = e2.detail;
    try {
      const updated = await this.hass.callWS({
        type: "calee/update_task",
        task_id: taskId,
        version,
        price
      });
      if (updated) {
        this._tasks = this._tasks.map(
          (t2) => t2.id === taskId ? updated : t2
        );
      }
    } catch (err) {
      console.error("Failed to update task price:", err);
    }
  }
  /** Handle task-quantity-update from shopping view. */
  async _onTaskQuantityUpdate(e2) {
    const { taskId, quantity, version } = e2.detail;
    try {
      const updated = await this.hass.callWS({
        type: "calee/update_task",
        task_id: taskId,
        version,
        quantity
      });
      if (updated) {
        this._tasks = this._tasks.map(
          (t2) => t2.id === taskId ? updated : t2
        );
      }
    } catch (err) {
      console.error("Failed to update task quantity:", err);
    }
  }
  /** Handle task-unit-update from shopping view. */
  async _onTaskUnitUpdate(e2) {
    const { taskId, unit, version } = e2.detail;
    try {
      const updated = await this.hass.callWS({
        type: "calee/update_task",
        task_id: taskId,
        version,
        unit
      });
      if (updated) {
        this._tasks = this._tasks.map(
          (t2) => t2.id === taskId ? updated : t2
        );
      }
    } catch (err) {
      console.error("Failed to update task unit:", err);
    }
  }
  /** Handle task-quick-add from tasks/shopping views. */
  async _onTaskQuickAdd(e2) {
    const listId = this._currentView === "shopping" ? this._lists.find((l2) => l2.list_type === "shopping")?.id ?? "shopping" : this._lists.find((l2) => l2.list_type === "standard")?.id ?? "inbox";
    const wsMsg = {
      type: "calee/create_task",
      list_id: listId,
      title: e2.detail.title,
      category: e2.detail.category ?? ""
    };
    if (e2.detail.due) {
      wsMsg.due = e2.detail.due;
    }
    if (e2.detail.recurrence_rule) {
      wsMsg.recurrence_rule = e2.detail.recurrence_rule;
    }
    if (e2.detail.note) {
      wsMsg.note = e2.detail.note;
    }
    try {
      const newTask = await this.hass.callWS(wsMsg);
      if (newTask) {
        if (newTask.merged) {
          this._tasks = this._tasks.map(
            (t2) => t2.id === newTask.id ? newTask : t2
          );
          const qty = newTask.quantity ?? 1;
          this._shoppingToast = `${newTask.title} — quantity updated to ${qty % 1 === 0 ? qty.toFixed(0) : qty}`;
        } else {
          this._tasks = [...this._tasks, newTask];
        }
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  }
  /** Handle task-update from tasks view (inline edit). */
  async _onTaskUpdate(e2) {
    const wsMsg = {
      type: "calee/update_task",
      task_id: e2.detail.taskId,
      version: e2.detail.version
    };
    if (e2.detail.title !== void 0) {
      wsMsg.title = e2.detail.title;
    }
    if (e2.detail.due !== void 0) {
      wsMsg.due = e2.detail.due;
    }
    if (e2.detail.recurrence_rule !== void 0) {
      wsMsg.recurrence_rule = e2.detail.recurrence_rule;
    }
    try {
      const updated = await this.hass.callWS(wsMsg);
      if (updated) {
        this._tasks = this._tasks.map(
          (t2) => t2.id === e2.detail.taskId ? updated : t2
        );
      }
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  }
  /** Handle preset-add from tasks/shopping views. */
  async _onPresetAdd(e2) {
    try {
      const result = await this.hass.callWS({
        type: "calee/add_from_preset",
        preset_id: e2.detail.presetId
      });
      if (result) {
        if (result.merged) {
          this._tasks = this._tasks.map(
            (t2) => t2.id === result.id ? result : t2
          );
          const qty = result.quantity ?? 1;
          this._shoppingToast = `${result.title} — quantity updated to ${qty % 1 === 0 ? qty.toFixed(0) : qty}`;
        } else {
          this._tasks = [...this._tasks, result];
        }
      }
    } catch (err) {
      console.error("Failed to add from preset:", err);
    }
  }
  /** Handle preset-create from shopping view. */
  async _onPresetCreate(e2) {
    try {
      const result = await this.hass.callWS({
        type: "calee/create_preset",
        title: e2.detail.title,
        list_id: e2.detail.list_id,
        category: e2.detail.category,
        icon: e2.detail.icon
      });
      if (result) {
        this._presets = [...this._presets, result];
      }
    } catch (err) {
      console.error("Failed to create preset:", err);
    }
  }
  /** Handle preset-delete from shopping view. */
  async _onPresetDelete(e2) {
    try {
      await this.hass.callWS({
        type: "calee/delete_preset",
        preset_id: e2.detail.presetId
      });
      this._presets = this._presets.filter((p2) => p2.id !== e2.detail.presetId);
    } catch (err) {
      console.error("Failed to delete preset:", err);
    }
  }
  /** Handle quick-add-task from the template picker — create a task with the given date as due date. */
  async _onQuickAddTask(e2) {
    const { date } = e2.detail;
    if (!this._tasksLoaded) {
      await this._loadTasks();
    }
    const listId = this._lists.find((l2) => l2.list_type === "standard")?.id ?? "inbox";
    try {
      const newTask = await this.hass.callWS({
        type: "calee/create_task",
        list_id: listId,
        title: "New task",
        due: date
      });
      if (newTask) {
        this._tasks = [...this._tasks, newTask];
        window.location.hash = `#/tasks/${newTask.id}`;
      } else {
        this._navigate("tasks");
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  }
  /** Handle quick-add-shopping from the template picker — create a shopping item. */
  async _onQuickAddShopping(e2) {
    if (!this._tasksLoaded) {
      await this._loadTasks();
    }
    const shoppingList = this._lists.find((l2) => l2.list_type === "shopping");
    const listId = shoppingList?.id ?? "shopping";
    try {
      const newTask = await this.hass.callWS({
        type: "calee/create_task",
        list_id: listId,
        title: "New item"
      });
      if (newTask) {
        this._tasks = [...this._tasks, newTask];
      }
      this._navigate("shopping");
    } catch (err) {
      console.error("Failed to create shopping item:", err);
    }
  }
  /** Handle template-select from the template picker. */
  async _onTemplateSelect(e2) {
    const { templateId, date } = e2.detail;
    try {
      const newEvent = await this.hass.callWS({
        type: "calee/add_shift_from_template",
        template_id: templateId,
        date
      });
      if (newEvent) {
        this._events = [...this._events, newEvent];
      }
    } catch (err) {
      console.error("Failed to add shift from template:", err);
    }
  }
  /** Handle custom-event from the template picker — open the event dialog for manual entry. */
  _onCustomEvent(e2) {
    const { date, time } = e2.detail;
    const nonWorkCal = this._rawCalendars.find((c2) => c2.id === "family_shared") ?? this._rawCalendars.find((c2) => c2.id === "personal") ?? this._rawCalendars.find((c2) => c2.id !== "work_shifts") ?? this._rawCalendars[0];
    this._editEvent = null;
    this._eventDialogDefaults = {
      date,
      time,
      calendar_id: nonWorkCal?.id
    };
    this._showTemplatePicker = false;
    this._showEventDialog = true;
  }
  /** Handle manage-templates from the template picker — open the template manager. */
  _onManageTemplates() {
    this._showTemplatePicker = false;
    this._showTemplateManager = true;
  }
  /** Handle template-created or template-deleted from the template manager — refresh templates. */
  async _onTemplateChanged() {
    try {
      this._templates = await this.hass.callWS({ type: "calee/templates" }) ?? [];
    } catch {
    }
  }
  /** Handle dialog-close from the template manager — return to template picker. */
  _onManagerClose() {
    this._showTemplateManager = false;
    this._showTemplatePicker = true;
  }
  /** Handle event-save from the event dialog (create or update). */
  async _onEventSave(e2) {
    const detail = e2.detail;
    try {
      const occParentId = this._editEvent?._occurrenceParentId;
      const occDate = this._editEvent?._occurrenceDate;
      if (occParentId && occDate) {
        const standalone = await this.hass.callWS({
          type: "calee/edit_event_occurrence",
          event_id: occParentId,
          date: occDate,
          title: detail.title,
          start: detail.start,
          end: detail.end,
          note: detail.note,
          calendar_id: detail.calendar_id
        });
        if (standalone) {
          this._events = this._events.filter(
            (ev) => ev.id !== `${occParentId}_${occDate}`
          );
          this._events = [...this._events, standalone];
        }
      } else if (detail.id) {
        const updated = await this.hass.callWS({
          type: "calee/update_event",
          event_id: detail.id,
          version: detail.version,
          title: detail.title,
          start: detail.start,
          end: detail.end,
          note: detail.note,
          recurrence_rule: detail.recurrence_rule ?? void 0
        });
        if (updated) {
          this._events = this._events.map(
            (ev) => ev.id === detail.id ? updated : ev
          );
        }
      } else {
        const created = await this.hass.callWS({
          type: "calee/create_event",
          calendar_id: detail.calendar_id,
          title: detail.title,
          start: detail.start,
          end: detail.end,
          note: detail.note,
          recurrence_rule: detail.recurrence_rule ?? void 0,
          template_id: detail.template_id ?? void 0
        });
        if (created) {
          this._events = [...this._events, created];
        }
      }
      this._recomputeConflicts();
    } catch (err) {
      console.error("Failed to save event:", err);
    }
  }
  /** Handle event-delete from the event dialog. */
  async _onEventDelete(e2) {
    const eventId = e2.detail.eventId;
    const event = this._events.find((ev) => ev.id === eventId);
    if (event && event.is_recurring_instance) {
      this._recurringActionEvent = event;
      this._showRecurringActionDialog = true;
      return;
    }
    try {
      await this.hass.callWS({
        type: "calee/delete_event",
        event_id: eventId
      });
      this._events = this._events.filter((ev) => ev.id !== eventId);
      this._recomputeConflicts();
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  }
  /** Handle dialog-close from event dialog, template picker, or template manager. */
  _onDialogClose() {
    this._showEventDialog = false;
    this._showTemplatePicker = false;
    this._showTemplateManager = false;
    this._showSettings = false;
    this._editEvent = null;
    this._eventDialogDefaults = {};
    this._templatePickerDate = "";
    this._templatePickerTime = "";
  }
  // ── Year View ────────────────────────────────────────────────────
  /** Handle day-click from year view — navigate to week view for that date. */
  _onYearDayClick(e2) {
    this._navigate("week", e2.detail.date);
  }
  // ── Settings ────────────────────────────────────────────────────
  /** Load user settings from the backend via WS. */
  async _loadSettings() {
    if (!this.hass) return;
    try {
      const result = await this.hass.callWS({ type: "calee/get_settings" });
      this._settingsWeekStart = result.week_start ?? "monday";
      this._settingsTimeFormat = result.time_format ?? "12h";
      this._settingsCurrency = result.currency ?? "$";
      this._settingsBudget = result.budget ?? 0;
    } catch {
    }
  }
  _openSettings() {
    this._showSettings = true;
  }
  _onSettingsClose() {
    this._showSettings = false;
  }
  _onSettingsChanged(_e) {
    this._showSettings = false;
    this._loadSettings();
  }
  // ── Recently Deleted ──────────────────────────────────────────────
  _openDeletedItems() {
    this._showDeletedItems = true;
  }
  _onDeletedItemsClose() {
    this._showDeletedItems = false;
  }
  // ── Activity Feed ─────────────────────────────────────────────────
  _openActivityFeed() {
    this._showActivityFeed = true;
  }
  _onActivityFeedClose() {
    this._showActivityFeed = false;
  }
  // ── Routines ─────────────────────────────────────────────────────
  async _executeRoutine(routineId) {
    if (!this.hass) return;
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    try {
      await this.hass.callWS({
        type: "calee/execute_routine",
        routine_id: routineId,
        date: today
      });
      this._refreshAll();
    } catch (err) {
      console.error("Failed to execute routine:", err);
    }
  }
  async _onRoutineExecute(e2) {
    await this._executeRoutine(e2.detail.routineId);
  }
  async _onRoutineChanged() {
    if (!this.hass) return;
    try {
      this._routines = await this.hass.callWS({ type: "calee/routines" }) ?? [];
    } catch {
    }
  }
  _onRoutineManagerClose() {
    this._showRoutineManager = false;
  }
  // ── Recurring Action Dialog (mobile) ──────────────────────────────
  _renderRecurringActionDialog() {
    const event = this._recurringActionEvent;
    if (!event) return A;
    return b`
      <div class="dialog-backdrop" @click=${this._closeRecurringActionDialog}>
        <div class="dialog-card" @click=${(e2) => e2.stopPropagation()} style="max-width:360px;">
          <h2 style="font-size:16px;margin:0 0 6px;">Recurring Event</h2>
          <p style="font-size:13px;color:var(--secondary-text-color,#757575);margin:0 0 16px;">${event.title}</p>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <button class="btn-save" style="text-align:center;" @click=${() => {
      this._closeRecurringActionDialog();
      this._onEditThisOccurrence(event);
    }}>Edit this occurrence</button>
            <button class="btn-cancel" style="text-align:center;" @click=${() => {
      this._closeRecurringActionDialog();
      this._onEditAllOccurrences(event);
    }}>Edit all occurrences</button>
            <button class="btn-cancel" style="text-align:center;color:var(--error-color,#f44336);" @click=${() => {
      this._closeRecurringActionDialog();
      this._onDeleteThisOccurrence(event);
    }}>Delete this occurrence</button>
            <button class="btn-cancel" style="text-align:center;color:var(--error-color,#f44336);" @click=${() => {
      this._closeRecurringActionDialog();
      this._onDeleteAllOccurrences(event);
    }}>Delete all occurrences</button>
            <button class="btn-cancel" style="text-align:center;" @click=${this._closeRecurringActionDialog}>Cancel</button>
          </div>
        </div>
      </div>
    `;
  }
  _closeRecurringActionDialog() {
    this._showRecurringActionDialog = false;
    this._recurringActionEvent = null;
  }
  // ── Calendar Manager ────────────────────────────────────────────────
  async _onCalendarManagerChanged() {
    try {
      const [calendars, lists] = await Promise.all([
        this.hass.callWS({ type: "calee/calendars" }),
        this.hass.callWS({ type: "calee/lists" })
      ]);
      this._rawCalendars = calendars ?? [];
      this._calendars = this._rawCalendars.map((c2) => ({
        id: c2.id,
        name: c2.name,
        color: c2.color ?? "#64b5f6",
        visible: this._calendars.find((existing) => existing.id === c2.id)?.visible ?? true
      }));
      this._lists = lists ?? [];
    } catch {
    }
  }
  _onCalendarManagerClose() {
    this._showCalendarManager = false;
  }
  // ── Quick Add Dialog ──────────────────────────────────────────────
  _renderAddDialog() {
    const now = /* @__PURE__ */ new Date();
    const hour = now.getHours();
    const startH = String(hour).padStart(2, "0");
    const endH = String(Math.min(hour + 1, 23)).padStart(2, "0");
    const defaultStart = `${this._currentDate}T${startH}:00`;
    const defaultEnd = `${this._currentDate}T${endH}:00`;
    return b`
      <div class="dialog-backdrop" @click=${this._closeAddDialog}>
        <div class="dialog-card" @click=${(e2) => e2.stopPropagation()}>
          <h2>New event</h2>
          <form @submit=${this._handleAddSubmit}>
            <label>
              Title
              <input type="text" name="title" required autofocus placeholder="e.g. Early Shift" />
            </label>
            <label>
              Calendar
              <select name="calendar_id">
                ${this._calendars.map(
      (c2) => b`<option value=${c2.id}>${c2.name}</option>`
    )}
              </select>
            </label>
            <div class="row">
              <label class="flex">
                Start
                <input type="datetime-local" name="start" value=${defaultStart} required />
              </label>
              <label class="flex">
                End
                <input type="datetime-local" name="end" value=${defaultEnd} required />
              </label>
            </div>
            <label>
              Note
              <textarea name="note" rows="2" placeholder="Optional note"></textarea>
            </label>
            <div class="dialog-actions">
              <button type="button" class="btn-cancel" @click=${this._closeAddDialog}>Cancel</button>
              <button type="submit" class="btn-save">Save</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
  _closeAddDialog() {
    this._showAddDialog = false;
  }
  async _handleAddSubmit(e2) {
    e2.preventDefault();
    const form = e2.target;
    const data = new FormData(form);
    const title = data.get("title");
    const calendarId = data.get("calendar_id");
    const start = data.get("start");
    const end = data.get("end");
    const note = data.get("note");
    if (!title || !start || !end) return;
    try {
      const created = await this.hass.callWS({
        type: "calee/create_event",
        calendar_id: calendarId,
        title,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        note: note || ""
      });
      if (created) {
        this._events = [...this._events, created];
      }
      this._showAddDialog = false;
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  }
};
CaleePanel.styles = i$3`
    /* ── Host ───────────────────────────────────────────────── */

    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
      color: var(--primary-text-color, #212121);
      background: var(--primary-background-color, #fafafa);
      font-size: 14px;
      font-weight: 400;
      line-height: 1.5;
      --sidebar-width: 260px;
    }

    /* ── Header — compact 44px bar with tabs ────────────────── */

    .header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 12px;
      height: 44px;
      min-height: 44px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      z-index: 4;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex-shrink: 0;
    }

    .hamburger {
      display: none;
      background: none;
      border: none;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      font-size: 18px;
      line-height: 1;
      transition: background 0.15s, color 0.15s;
      min-width: 32px;
      min-height: 32px;
      align-items: center;
      justify-content: center;
    }

    .hamburger:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    :host([narrow]) .hamburger {
      display: flex;
    }

    .title {
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
      color: var(--primary-text-color, #212121);
      letter-spacing: 0.2px;
    }

    /* ── View tabs — inline in header ──────────────────────── */

    .header-tabs {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: 12px;
    }

    .view-tab {
      background: none;
      border: none;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      text-transform: capitalize;
      letter-spacing: 0.1px;
      transition: color 0.15s, background 0.15s;
      white-space: nowrap;
      line-height: 1;
    }

    .view-tab:hover {
      color: var(--primary-text-color, #212121);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .view-tab[active] {
      color: var(--primary-text-color, #212121);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
      font-weight: 600;
    }

    /* ── Settings cog ──────────────────────────────────────── */

    .settings-cog {
      background: none;
      border: none;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      transition: background 0.15s, color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-left: 4px;
    }

    .settings-cog:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    .settings-cog svg {
      width: 18px;
      height: 18px;
    }

    /* ── Date nav — right side of header ───────────────────── */

    .header-date-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      flex-shrink: 0;
    }

    .date-nav-btn {
      background: none;
      border: none;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 16px;
      line-height: 1;
      transition: background 0.15s, color 0.15s;
      min-width: 28px;
      min-height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .date-nav-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    .today-btn {
      background: transparent;
      border: 1px solid var(--divider-color, #e0e0e0);
      color: var(--primary-text-color, #212121);
      cursor: pointer;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.15s, border-color 0.15s;
      line-height: 1;
    }

    .today-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border-color: var(--secondary-text-color, #727272);
    }

    .date-label {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--primary-text-color, #212121);
    }

    /* ── Body (sidebar + main) ──────────────────────────────── */

    .body {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    /* ── Sidebar — clean clean ──────────────────────── */

    .sidebar {
      width: var(--sidebar-width);
      min-width: var(--sidebar-width);
      background: var(--sidebar-background-color, var(--card-background-color, #fff));
      border-right: 1px solid var(--divider-color, #e0e0e0);
      overflow-y: auto;
      padding: 8px 0;
      z-index: 3;
      transition: width 0.2s ease, min-width 0.2s ease, transform 0.25s ease;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .sidebar.collapsed {
      width: 48px;
      min-width: 48px;
      overflow-x: hidden;
      overflow-y: auto;
    }

    .sidebar.collapsed .sidebar-add-btn,
    .sidebar.collapsed .nav-item span,
    .sidebar.collapsed .nav-item-muted span,
    .sidebar.collapsed .section-label,
    .sidebar.collapsed .cal-toggle-name,
    .sidebar.collapsed .sidebar-upcoming,
    .sidebar.collapsed .sidebar-cards {
      display: none;
    }

    .sidebar.collapsed .nav-item,
    .sidebar.collapsed .nav-item-muted {
      justify-content: center;
      padding: 8px 0;
    }

    .sidebar-collapse-btn {
      position: absolute;
      top: 8px;
      right: -12px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: var(--secondary-text-color, #666);
      z-index: 5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: background 0.15s;
    }

    .sidebar-collapse-btn:hover {
      background: var(--primary-background-color, #f5f5f5);
    }

    :host([narrow]) .sidebar-collapse-btn {
      display: none;
    }

    :host([narrow]) .sidebar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      transform: translateX(-100%);
      box-shadow: none;
    }

    :host([narrow]) .sidebar.open {
      transform: translateX(0);
      box-shadow: 2px 0 12px rgba(0, 0, 0, 0.12);
    }

    .sidebar-backdrop {
      display: none;
    }

    :host([narrow]) .sidebar-backdrop {
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 2;
    }

    :host([narrow]) .sidebar-backdrop.visible {
      display: block;
    }

    /* ── Sidebar: Add button (clean) ────────────────── */

    .sidebar-add-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      margin: 4px 12px 8px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      color: var(--primary-color, #03a9f4);
      transition: background 0.15s;
      font-family: inherit;
      line-height: 1;
    }

    .sidebar-add-btn:hover {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
    }

    .sidebar-add-btn svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    /* ── Sidebar: Navigation items ──────────────────────────── */

    .sidebar-nav {
      padding: 0 8px;
      margin-bottom: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 12px;
      cursor: pointer;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 400;
      color: var(--primary-text-color, #212121);
      transition: background 0.15s;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: inherit;
      line-height: 1.3;
    }

    .nav-item:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .nav-item[active] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
      color: var(--primary-color, #03a9f4);
      font-weight: 500;
    }

    .nav-item svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: var(--secondary-text-color, #727272);
    }

    .nav-item[active] svg {
      color: var(--primary-color, #03a9f4);
    }

    .nav-item-muted {
      font-size: 13px;
      color: var(--secondary-text-color, #727272);
    }

    .nav-item-muted svg {
      width: 18px;
      height: 18px;
    }

    /* Calendar icon with date number */
    .nav-calendar-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .nav-calendar-icon svg {
      width: 20px;
      height: 20px;
    }

    .nav-calendar-icon .date-num {
      position: absolute;
      bottom: 1px;
      left: 0;
      right: 0;
      font-size: 8px;
      font-weight: 700;
      text-align: center;
      line-height: 1;
      color: var(--secondary-text-color, #727272);
    }

    .nav-item[active] .nav-calendar-icon .date-num {
      color: var(--primary-color, #03a9f4);
    }

    /* ── Sidebar: Section headers ──────────────────────────── */

    .sidebar-section {
      padding: 0 8px;
      margin-bottom: 4px;
    }

    .sidebar-heading {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--secondary-text-color, #727272);
      padding: 16px 12px 6px;
      margin: 0;
    }

    /* ── Sidebar: Calendar toggles ─────────────────────────── */

    .calendar-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.15s;
      font-size: 14px;
    }

    .calendar-item:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .calendar-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--cal-color, #64b5f6);
      flex-shrink: 0;
      transition: opacity 0.15s;
    }

    .calendar-dot.hidden {
      opacity: 0.25;
    }

    .calendar-name {
      font-size: 14px;
      font-weight: 400;
      color: var(--primary-text-color, #212121);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Sidebar: List items ───────────────────────────────── */

    .list-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 6px;
      text-decoration: none;
      color: var(--primary-text-color, #212121);
      font-size: 14px;
      font-weight: 400;
      transition: background 0.15s;
    }

    .list-item:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .list-item[active] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
      color: var(--primary-color, #03a9f4);
      font-weight: 500;
    }

    .list-item svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: var(--secondary-text-color, #727272);
    }

    .list-item[active] svg {
      color: var(--primary-color, #03a9f4);
    }

    /* ── Sidebar: Shift cards ──────────────────────────────── */

    .sidebar-cards {
      padding: 4px 8px 0;
      margin-top: auto;
    }

    /* ── Sidebar: Upcoming events ─────────────────────────── */

    .sidebar-upcoming {
      padding: 4px 8px 8px;
    }

    .sidebar-upcoming .section-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--secondary-text-color, #727272);
      padding: 8px 8px 6px;
    }

    .upcoming-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
      border-radius: 6px;
      font-size: 13px;
    }

    .upcoming-item .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .upcoming-item .upcoming-title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--primary-text-color, #212121);
      font-weight: 400;
    }

    .upcoming-item .upcoming-time {
      font-size: 11px;
      color: var(--secondary-text-color, #757575);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ── Main View ──────────────────────────────────────────── */

    .main {
      flex: 1;
      overflow: hidden;
      position: relative;
      background: var(--card-background-color, #fff);
    }

    .view-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 14px;
      color: var(--secondary-text-color, #727272);
      text-align: center;
      padding: 32px;
    }

    .view-placeholder .inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .view-placeholder .label {
      font-size: 18px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
    }

    .view-placeholder .sub {
      font-size: 13px;
      color: var(--secondary-text-color, #727272);
      font-weight: 400;
    }

    /* ── Loading ─────────────────────────────────────────────── */

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--secondary-text-color, #727272);
      font-size: 14px;
      font-weight: 400;
    }

    /* ── Mobile bottom nav bar ──────────────────────────────── */

    .bottom-nav {
      display: none;
    }

    :host([narrow]) .bottom-nav {
      display: flex;
      align-items: center;
      justify-content: space-around;
      height: 52px;
      min-height: 52px;
      background: var(--card-background-color, #fff);
      border-top: 1px solid var(--divider-color, #e0e0e0);
      z-index: 4;
      padding: 0 4px;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    .bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 4px 8px;
      min-width: 44px;
      min-height: 44px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--secondary-text-color, #727272);
      font-size: 10px;
      font-weight: 500;
      font-family: inherit;
      transition: color 0.15s;
      border-radius: 8px;
    }

    .bottom-nav-item[active] {
      color: var(--primary-color, #03a9f4);
    }

    .bottom-nav-item svg {
      width: 22px;
      height: 22px;
    }

    /* ── Narrow / responsive overrides ──────────────────────── */

    :host([narrow]) .header-tabs {
      display: none;
    }

    :host([narrow]) .header {
      padding: 0 8px;
      gap: 2px;
    }

    :host([narrow]) .date-label {
      font-size: 11px;
      max-width: 110px;
    }

    :host([narrow]) .title {
      font-size: 14px;
    }

    :host([narrow]) .today-btn {
      padding: 2px 8px;
      font-size: 11px;
    }

    :host([narrow]) .date-nav-btn {
      min-width: 24px;
      min-height: 24px;
      padding: 2px 4px;
      font-size: 14px;
    }

    :host([narrow]) .settings-cog {
      padding: 4px;
    }

    :host([narrow]) .settings-cog svg {
      width: 16px;
      height: 16px;
    }

    :host([narrow]) .header-date-nav {
      gap: 2px;
    }

    @media (max-width: 480px) {
      .header-date-nav .date-label {
        max-width: 100px;
      }
    }

    /* ── Dialog — lighter, softer ────────────────────────────── */

    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .dialog-card {
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 16px;
      padding: 28px;
      width: 90%;
      max-width: 480px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    }

    .dialog-card h2 {
      margin: 0 0 20px;
      font-size: 18px;
      font-weight: 500;
    }

    .dialog-card label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 14px;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.2px;
      color: var(--secondary-text-color, #727272);
    }

    .dialog-card input,
    .dialog-card select,
    .dialog-card textarea {
      padding: 10px 12px;
      border: 2px solid transparent;
      border-radius: 8px;
      font-size: 14px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
      font-family: inherit;
      transition: border-color 0.15s, background 0.15s;
      outline: none;
    }

    .dialog-card input:focus,
    .dialog-card select:focus,
    .dialog-card textarea:focus {
      border-color: var(--primary-color, #03a9f4);
      background: var(--card-background-color, #fff);
    }

    .dialog-card input::placeholder,
    .dialog-card textarea::placeholder {
      color: var(--secondary-text-color, #727272);
      opacity: 0.6;
    }

    .dialog-card .row {
      display: flex;
      gap: 12px;
    }

    .dialog-card .flex {
      flex: 1;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 20px;
    }

    .btn-cancel {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.15s;
    }

    .btn-cancel:hover {
      background: var(--divider-color, #e0e0e0);
    }

    .btn-save {
      padding: 8px 20px;
      border: none;
      border-radius: 8px;
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: opacity 0.15s;
    }

    .btn-save:hover {
      opacity: 0.9;
    }

    /* ── Detail Drawer (desktop right panel) ──────────────── */

    .detail-drawer {
      width: 360px;
      min-width: 360px;
      background: var(--card-background-color, #fff);
      border-left: 1px solid var(--divider-color, #e0e0e0);
      overflow-y: auto;
      padding: 20px;
      transition: width 0.2s ease, min-width 0.2s ease;
      z-index: 3;
    }

    .detail-drawer.closed {
      width: 0;
      min-width: 0;
      padding: 0;
      overflow: hidden;
      border-left-width: 0;
    }

    :host([narrow]) .detail-drawer {
      display: none;
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .drawer-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
    }

    .drawer-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 18px;
      line-height: 1;
      color: var(--secondary-text-color, #757575);
      transition: background 0.15s, color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .drawer-close-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    .drawer-field {
      margin-bottom: 14px;
    }

    .drawer-field-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--secondary-text-color, #757575);
      margin-bottom: 4px;
    }

    .drawer-field-value {
      font-size: 14px;
      color: var(--primary-text-color, #212121);
      line-height: 1.4;
    }

    .drawer-field-value.muted {
      color: var(--secondary-text-color, #757575);
      font-style: italic;
    }

    .drawer-actions {
      display: flex;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }

    .drawer-btn {
      font-size: 13px;
      font-weight: 500;
      padding: 6px 16px;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: background 0.15s, color 0.15s;
      font-family: inherit;
    }

    .drawer-btn-edit {
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }
    .drawer-btn-edit:hover {
      filter: brightness(1.1);
    }

    .drawer-btn-delete {
      background: transparent;
      color: var(--error-color, #f44336);
      border: 1px solid var(--error-color, #f44336);
    }
    .drawer-btn-delete:hover {
      background: color-mix(in srgb, var(--error-color, #f44336) 10%, transparent);
    }

    .drawer-edit-input {
      width: 100%;
      font-size: 14px;
      padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 6px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      box-sizing: border-box;
      font-family: inherit;
      transition: border-color 0.15s;
    }
    .drawer-edit-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .drawer-edit-textarea {
      width: 100%;
      font-size: 14px;
      padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 6px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      box-sizing: border-box;
      font-family: inherit;
      resize: vertical;
      min-height: 60px;
      transition: border-color 0.15s;
    }
    .drawer-edit-textarea:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .drawer-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--secondary-text-color, #757575);
    }
  `;
__decorateClass([
  n2({ attribute: false })
], CaleePanel.prototype, "hass", 2);
__decorateClass([
  n2({ type: Boolean, reflect: true })
], CaleePanel.prototype, "narrow", 2);
__decorateClass([
  n2({ attribute: false })
], CaleePanel.prototype, "panel", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_currentView", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_currentDate", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_drawerOpen", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_sidebarCollapsed", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_calendars", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_lists", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_loading", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_showAddDialog", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_events", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_tasks", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_templates", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_presets", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_routines", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_rawCalendars", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_settingsWeekStart", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_settingsTimeFormat", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_settingsCurrency", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_settingsBudget", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_detailDrawerOpen", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_detailItem", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_detailItemType", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_showRecurringActionDialog", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_recurringActionEvent", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_showCalendarManager", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_conflicts", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_editEvent", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_showEventDialog", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_eventDialogDefaults", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_showTemplatePicker", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_templatePickerDate", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_templatePickerTime", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_showTemplateManager", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_showSettings", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_showDeletedItems", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_showActivityFeed", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_showRoutineManager", 2);
__decorateClass([
  r()
], CaleePanel.prototype, "_shoppingToast", 2);
CaleePanel = __decorateClass([
  t("calee-panel")
], CaleePanel);
class PlannerConnection {
  constructor(hass) {
    this._hass = hass;
  }
  /** Replace the hass reference (called when HA reconnects). */
  updateHass(hass) {
    this._hass = hass;
  }
  // ── Read queries ──────────────────────────────────────────────────
  getCalendars() {
    return this._hass.callWS({
      type: "calee/calendars"
    });
  }
  getEvents(calendarId, start, end) {
    const msg = {
      type: "calee/events"
    };
    if (calendarId) msg.calendar_id = calendarId;
    if (start) msg.start = start;
    if (end) msg.end = end;
    return this._hass.callWS(msg);
  }
  getTasks(opts) {
    const msg = {
      type: "calee/tasks"
    };
    if (opts?.listId) msg.list_id = opts.listId;
    if (opts?.view) msg.view = opts.view;
    if (opts?.completed !== void 0) msg.completed = opts.completed;
    if (opts?.limit !== void 0) msg.limit = opts.limit;
    return this._hass.callWS(msg);
  }
  getLists() {
    return this._hass.callWS({
      type: "calee/lists"
    });
  }
  getTemplates() {
    return this._hass.callWS({
      type: "calee/templates"
    });
  }
  // ── Event mutations ───────────────────────────────────────────────
  createEvent(params) {
    return this._hass.callWS({
      type: "calee/create_event",
      ...params
    });
  }
  updateEvent(params) {
    return this._hass.callWS({
      type: "calee/update_event",
      ...params
    });
  }
  deleteEvent(eventId) {
    return this._hass.callWS({
      type: "calee/delete_event",
      event_id: eventId
    });
  }
  // ── Task mutations ────────────────────────────────────────────────
  createTask(params) {
    return this._hass.callWS({
      type: "calee/create_task",
      ...params
    });
  }
  updateTask(params) {
    return this._hass.callWS({
      type: "calee/update_task",
      ...params
    });
  }
  deleteTask(taskId) {
    return this._hass.callWS({
      type: "calee/delete_task",
      task_id: taskId
    });
  }
  completeTask(taskId) {
    return this._hass.callWS({
      type: "calee/complete_task",
      task_id: taskId
    });
  }
  // ── Template mutations ────────────────────────────────────────────
  createTemplate(params) {
    return this._hass.callWS({
      type: "calee/create_template",
      ...params
    });
  }
  updateTemplate(params) {
    return this._hass.callWS({
      type: "calee/update_template",
      ...params
    });
  }
  deleteTemplate(templateId) {
    return this._hass.callWS({
      type: "calee/delete_template",
      template_id: templateId
    });
  }
  addShiftFromTemplate(templateId, date) {
    return this._hass.callWS({
      type: "calee/add_shift_from_template",
      template_id: templateId,
      date
    });
  }
  // ── Preset queries & mutations ─────────────────────────────────────
  getPresets() {
    return this._hass.callWS({
      type: "calee/presets"
    });
  }
  addFromPreset(presetId) {
    return this._hass.callWS({
      type: "calee/add_from_preset",
      preset_id: presetId
    });
  }
  // ── Routine queries ────────────────────────────────────────────────
  getRoutines() {
    return this._hass.callWS({
      type: "calee/routines"
    });
  }
  // ── Subscription ──────────────────────────────────────────────────
  /**
   * Subscribe to real-time planner change notifications.
   *
   * Returns an unsubscribe function. The callback fires whenever
   * a calendar, event, task, list, or template is created / updated /
   * deleted by any user or automation.
   */
  subscribe(callback) {
    return this._hass.connection.subscribeMessage(callback, {
      type: "calee/subscribe"
    });
  }
}
class PlannerStore {
  constructor(hass) {
    this.calendars = [];
    this.events = [];
    this.tasks = [];
    this.lists = [];
    this.templates = [];
    this.presets = [];
    this.routines = [];
    this.selectedDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    this.currentView = "month";
    this.enabledCalendarIds = /* @__PURE__ */ new Set();
    this.loading = false;
    this.error = null;
    this._unsub = null;
    this._listeners = /* @__PURE__ */ new Set();
    this._refreshDebounce = null;
    this._conn = new PlannerConnection(hass);
  }
  /** The underlying connection (for one-off mutations from views). */
  get connection() {
    return this._conn;
  }
  // ── Hass lifecycle ────────────────────────────────────────────────
  /** Call when the `hass` object changes (HA reconnect). */
  updateHass(hass) {
    this._conn.updateHass(hass);
  }
  /** Property-style setter so callers can write `store.hass = newHass`. */
  set hass(hass) {
    this.updateHass(hass);
  }
  // ── Subscription helpers ──────────────────────────────────────────
  /**
   * Register a listener that is called whenever the store data changes.
   * Returns an unsubscribe function.
   */
  addListener(listener) {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }
  _notify() {
    for (const fn of this._listeners) {
      try {
        fn();
      } catch {
      }
    }
  }
  // ── Data loading ──────────────────────────────────────────────────
  /**
   * Initial load — fetch all data and start the real-time subscription.
   */
  async load() {
    this.loading = true;
    this.error = null;
    this._notify();
    try {
      await this._fetchAll();
      await this._subscribe();
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to load planner data";
    } finally {
      this.loading = false;
      this._notify();
    }
  }
  /**
   * Re-fetch all data from the backend (e.g. after receiving a change
   * notification or on user-initiated refresh).
   */
  async refresh() {
    try {
      await this._fetchAll();
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to refresh planner data";
    }
    this._notify();
  }
  /** Tear down the subscription when the panel is disconnected. */
  async dispose() {
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
    if (this._refreshDebounce) {
      clearTimeout(this._refreshDebounce);
      this._refreshDebounce = null;
    }
  }
  // ── Filtered accessors ────────────────────────────────────────────
  /**
   * Return events whose date range overlaps [start, end].
   * Both parameters are ISO 8601 date strings (YYYY-MM-DD).
   */
  getEventsForDateRange(start, end) {
    const rangeStart = start.slice(0, 10);
    const rangeEnd = end.slice(0, 10);
    return this.events.filter((ev) => {
      if (this.enabledCalendarIds.size > 0 && !this.enabledCalendarIds.has(ev.calendar_id)) {
        return false;
      }
      const evStart = ev.start.slice(0, 10);
      const evEnd = ev.end ? ev.end.slice(0, 10) : evStart;
      return evEnd >= rangeStart && evStart <= rangeEnd;
    });
  }
  /**
   * Return tasks filtered for a virtual view.
   *
   * - "today"    — tasks due today (or overdue)
   * - "upcoming" — tasks due after today
   * - undefined  — all active tasks
   */
  getTasksForView(view) {
    if (!view) return this.tasks;
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (view === "today") {
      return this.tasks.filter(
        (t2) => t2.due !== null && t2.due.slice(0, 10) <= today
      );
    }
    if (view === "upcoming") {
      return this.tasks.filter(
        (t2) => t2.due !== null && t2.due.slice(0, 10) > today
      );
    }
    return this.tasks;
  }
  /**
   * Return tasks belonging to a specific list.
   */
  getTasksForList(listId) {
    return this.tasks.filter((t2) => t2.list_id === listId);
  }
  // ── View state helpers ────────────────────────────────────────────
  setView(view) {
    this.currentView = view;
    this._notify();
  }
  setSelectedDate(date) {
    this.selectedDate = date;
    this._notify();
  }
  toggleCalendar(calendarId) {
    if (this.enabledCalendarIds.has(calendarId)) {
      this.enabledCalendarIds.delete(calendarId);
    } else {
      this.enabledCalendarIds.add(calendarId);
    }
    this._notify();
  }
  // ── Private helpers ───────────────────────────────────────────────
  /**
   * Return presets loaded by the store.
   */
  getPresets() {
    return this.presets;
  }
  /**
   * Return routines loaded by the store.
   */
  getRoutines() {
    return this.routines;
  }
  async _fetchAll() {
    const [calendars, events, tasks, lists, templates, presets, routines] = await Promise.all([
      this._conn.getCalendars(),
      this._conn.getEvents(),
      this._conn.getTasks({}),
      this._conn.getLists(),
      this._conn.getTemplates(),
      this._conn.getPresets(),
      this._conn.getRoutines()
    ]);
    this.calendars = calendars;
    this.events = events;
    this.tasks = tasks;
    this.lists = lists;
    this.templates = templates;
    this.presets = presets;
    this.routines = routines;
    if (this.enabledCalendarIds.size === 0 && calendars.length > 0) {
      this.enabledCalendarIds = new Set(calendars.map((c2) => c2.id));
    }
  }
  async _subscribe() {
    if (this._unsub) return;
    this._unsub = await this._conn.subscribe(
      (_event) => {
        if (this._refreshDebounce) {
          clearTimeout(this._refreshDebounce);
        }
        this._refreshDebounce = setTimeout(() => {
          this._refreshDebounce = null;
          void this.refresh();
        }, 250);
      }
    );
  }
}
let _instance = null;
function getStore(hass) {
  if (!_instance) {
    _instance = new PlannerStore(hass);
  } else {
    _instance.updateHass(hass);
  }
  return _instance;
}
const plannerStore = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  PlannerStore,
  getStore
}, Symbol.toStringTag, { value: "Module" }));
export {
  CaleePanel
};
