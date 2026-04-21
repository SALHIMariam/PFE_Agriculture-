declare module '*.module.css' {
  const styles: { readonly [className: string]: string };
  export default styles;
}

declare module '*.css?inline' {
  const content: string;
  export default content;
}
