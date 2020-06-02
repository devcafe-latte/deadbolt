CREATE TABLE `smsTwoFactor` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `token` varchar(100) NOT NULL,
  `userToken` varchar(36) NOT NULL,
  `expires` int(11) NOT NULL,
  `used` tinyint(4) NOT NULL DEFAULT 0,
  `attempt` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `smsTwoFactor_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
