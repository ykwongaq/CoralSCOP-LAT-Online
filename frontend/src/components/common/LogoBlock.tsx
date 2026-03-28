import LogoImage from "../../assets/images/logo.png";

export default function LogoBlock() {
  return (
    <div className="logo-blk">
      <img className="logo-blk__img" src={LogoImage} alt="Logo" />
      <span className="logo-blk__text">CoralSCOP-LAT</span>
    </div>
  );
}
