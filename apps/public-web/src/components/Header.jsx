export default function Header() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        padding: "20px",
        background: "#6a1b9a",
        color: "white",
        width: "100%",
      }}
    >
      <img
        src="/logo.png"
        alt="Angel Montessori School Logo"
        style={{ height: "60px", marginRight: "20px" }}
      />
      <h1>Angel Montessori School</h1>
    </header>
  );
}
