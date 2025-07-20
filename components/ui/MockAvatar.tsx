import { Image } from "react-native"

const MockAvatar = () => {
  return (
    <Image
      source={{uri:"https://api.dicebear.com/9.x/notionists/svg"}}
      className="size-12 rounded shrink-0 bg-violet-500 shadow"
    />
  )
}

export default MockAvatar;