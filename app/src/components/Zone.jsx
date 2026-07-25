const Zone = {
  Header: ({ children }) => <header className="wq-header">{children}</header>,
  Stage: ({ children, scroll }) => <main className={"wq-stage" + (scroll ? " wq-scroll" : "")}>{children}</main>,
  Rail: ({ children }) => <div className="wq-rail">{children}</div>,
  Strip: ({ children }) => <div className="wq-strip">{children}</div>,
};

export default Zone;
