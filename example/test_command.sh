#!/bin/bash
echo "env:"
echo "----"
echo ""
env
echo ""

echo "args:"
echo "-----"
echo ""
echo $@
echo ""
echo -e "normal 123 >🙂< "
echo -e "\e[1mbold 123 >🙂< \e[0m"
echo -e "\e[3mitalic 123 >🙂< \e[0m"
echo -e "\e[3m\e[1mbold italic 123 >🙂< \e[0m"
echo -e "\e[4munderline 123 >🙂< \e[0m"
echo -e "\e[9mstrikethrough 123 >🙂< \e[0m"
echo -e "\e[31mHello World 123 >🙂< \e[0m"
echo -e "\x1B[31mHello World 123 >🙂< \e[0m"

#bash
